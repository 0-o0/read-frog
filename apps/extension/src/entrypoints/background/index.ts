import type { TextUIPart } from 'ai'
import { browser, defineBackground } from '#imports'
import { readUIMessageStream, streamText } from 'ai'
import { WEBSITE_URL } from '@/utils/constants/url'
import { logger } from '@/utils/logger'
import { onMessage, sendMessage } from '@/utils/message'
import { getReadModelById, getTranslateModelById } from '@/utils/providers/model'
import { SessionCacheGroupRegistry } from '@/utils/session-cache/session-cache-group-registry'
import { ensureInitializedConfig } from './config'
import { setUpConfigBackup } from './config-backup'
import { cleanupAllCache, setUpDatabaseCleanup } from './db-cleanup'
import { initMockData } from './mock-data'
import { newUserGuide } from './new-user-guide'
import { proxyFetch } from './proxy-fetch'
import { setUpRequestQueue } from './translation-queues'
import { translationMessage } from './translation-signal'
import { setupUninstallSurvey } from './uninstall-survey'

interface AnalyzeSelectionParams {
  providerId: string
  systemPrompt: string
  userMessage: string
  temperature?: number
}

interface StreamOptions {
  signal?: AbortSignal
  onChunk?: (chunk: string, fullResponse: string) => void
}

interface TranslateStreamParams {
  providerId: string
  prompt: string
  providerOptions?: unknown
  temperature?: number
}

type ExtensionPort = ReturnType<typeof browser.runtime.connect>

interface AnalyzeSelectionPortMessage {
  type: 'start'
  payload: AnalyzeSelectionParams
}

interface TranslatePortMessage {
  type: 'start'
  payload: TranslateStreamParams
}

type StreamPortResponse
  = | { type: 'chunk', data: string }
    | { type: 'done', data: string }
    | { type: 'error', error: string }

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unexpected error occurred'
}

/**
 * Generic port handler for streaming operations
 * Reduces duplication between analyze and translate handlers
 */
function createStreamPortHandler<TMessage, TPayload>(
  streamFn: (payload: TPayload, options: StreamOptions) => Promise<string>,
  messageValidator: (msg: unknown) => msg is TMessage & { payload: TPayload },
) {
  return (port: ExtensionPort) => {
    const abortController = new AbortController()
    let isActive = true
    let hasStarted = false
    let messageListener: ((rawMessage: unknown) => void) | undefined
    let disconnectListener: (() => void) | undefined

    const safePost = (response: StreamPortResponse) => {
      if (!isActive || abortController.signal.aborted) {
        return
      }
      try {
        port.postMessage(response)
      }
      catch (error) {
        logger.error('[Background] Stream port post failed', error)
      }
    }

    const cleanup = () => {
      if (!isActive) {
        return
      }
      isActive = false
      if (messageListener) {
        port.onMessage.removeListener(messageListener)
      }
      if (disconnectListener) {
        port.onDisconnect.removeListener(disconnectListener)
      }
    }

    disconnectListener = () => {
      abortController.abort()
      cleanup()
    }

    messageListener = async (rawMessage: unknown) => {
      if (hasStarted) {
        return
      }

      if (!messageValidator(rawMessage)) {
        return
      }

      hasStarted = true

      try {
        const result = await streamFn(rawMessage.payload, {
          signal: abortController.signal,
          onChunk: (_, fullResponse) => {
            safePost({ type: 'chunk', data: fullResponse })
          },
        })

        if (!abortController.signal.aborted) {
          safePost({ type: 'done', data: result })
        }
      }
      catch (error) {
        if (!abortController.signal.aborted) {
          safePost({ type: 'error', error: getErrorMessage(error) })
        }
      }
      finally {
        cleanup()
        try {
          port.disconnect()
        }
        catch {
          // Ignore disconnect errors in Firefox
        }
      }
    }

    port.onMessage.addListener(messageListener)
    port.onDisconnect.addListener(disconnectListener)
  }
}

async function runAnalyzeSelectionStream(
  params: AnalyzeSelectionParams,
  options: StreamOptions = {},
) {
  const { providerId, systemPrompt, userMessage, temperature = 0.2 } = params
  const { signal, onChunk } = options

  if (signal?.aborted) {
    throw new DOMException('stream aborted', 'AbortError')
  }

  const model = await getReadModelById(providerId)

  const result = await streamText({
    model,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
    abortSignal: signal,
  })

  let fullResponse = ''

  for await (const delta of result.textStream) {
    if (signal?.aborted) {
      throw new DOMException('stream aborted', 'AbortError')
    }

    fullResponse += delta
    onChunk?.(delta, fullResponse)
  }

  return fullResponse
}

async function runTranslateLLMStream(
  params: TranslateStreamParams,
  options: StreamOptions = {},
) {
  const { providerId, prompt, providerOptions, temperature } = params
  const { signal, onChunk } = options

  if (signal?.aborted) {
    throw new DOMException('stream aborted', 'AbortError')
  }

  const model = await getTranslateModelById(providerId)

  const streamConfig: Record<string, unknown> = {
    model,
    prompt,
    abortSignal: signal,
  }

  if (providerOptions !== undefined) {
    streamConfig.providerOptions = providerOptions
  }

  if (temperature !== undefined) {
    streamConfig.temperature = temperature
  }

  const result = await streamText(streamConfig as Parameters<typeof streamText>[0])

  let latestText = ''

  for await (const uiMessage of readUIMessageStream({ stream: result.toUIMessageStream() })) {
    if (signal?.aborted) {
      throw new DOMException('stream aborted', 'AbortError')
    }

    const lastPart = uiMessage.parts[uiMessage.parts.length - 1] as TextUIPart | undefined
    if (lastPart?.type === 'text') {
      latestText = lastPart.text
      onChunk?.(latestText, latestText)
    }
  }

  return latestText
}

const handleAnalyzeSelectionPort = createStreamPortHandler<
  AnalyzeSelectionPortMessage,
  AnalyzeSelectionParams
>(
  runAnalyzeSelectionStream,
  (msg): msg is AnalyzeSelectionPortMessage => {
    const message = msg as AnalyzeSelectionPortMessage
    return message?.type === 'start' && !!message.payload
  },
)

const handleTranslateStreamPort = createStreamPortHandler<
  TranslatePortMessage,
  TranslateStreamParams
>(
  runTranslateLLMStream,
  (msg): msg is TranslatePortMessage => {
    const message = msg as TranslatePortMessage
    return message?.type === 'start' && !!message.payload
  },
)

export default defineBackground({
  type: 'module',
  main: () => {
    logger.info('Hello background!', { id: browser.runtime.id })

    browser.runtime.onInstalled.addListener(async (details) => {
      await ensureInitializedConfig()

      // Open tutorial page when extension is installed
      if (details.reason === 'install') {
        await browser.tabs.create({
          url: `${WEBSITE_URL}/guide/step-1`,
        })
      }

      // Clear blog cache on extension update to fetch latest blog posts
      if (details.reason === 'update') {
        logger.info('[Background] Extension updated, clearing blog cache')
        await SessionCacheGroupRegistry.removeCacheGroup('blog-fetch')
      }
    })

    onMessage('openPage', async (message) => {
      const { url, active } = message.data
      logger.info('openPage', { url, active })
      await browser.tabs.create({ url, active: active ?? true })
    })

    onMessage('openOptionsPage', () => {
      logger.info('openOptionsPage')
      void browser.runtime.openOptionsPage()
    })

    onMessage('popupRequestReadArticle', async (message) => {
      void sendMessage('readArticle', undefined, message.data.tabId)
    })

    onMessage('analyzeSelection', async (message) => {
      try {
        return await runAnalyzeSelectionStream(message.data)
      }
      catch (error) {
        logger.error('[Background] analyzeSelection failed', error)
        throw error
      }
    })

    browser.runtime.onConnect.addListener((port) => {
      if (port.name === 'analyze-selection-stream') {
        handleAnalyzeSelectionPort(port)
        return
      }

      if (port.name === 'translate-text-stream') {
        handleTranslateStreamPort(port)
      }
    })

    onMessage('clearAllCache', async () => {
      await cleanupAllCache()
    })

    newUserGuide()
    translationMessage()

    void setUpRequestQueue()
    void setUpDatabaseCleanup()
    setUpConfigBackup()
    void setupUninstallSurvey()

    proxyFetch()
    void initMockData()
  },
})
