/**
 * Firefox WebExtension compatibility helpers shared across UI components.
 */

interface RadixLikeEvent extends Event {
  originalEvent?: RadixLikeEvent
  detail?: {
    originalEvent?: RadixLikeEvent
  }
}

export type FirefoxOutsideInteractionGuard = (event: RadixLikeEvent) => boolean

const firefoxOutsideGuards = new Set<FirefoxOutsideInteractionGuard>()
const MAX_DEPTH = 10

export function isFirefoxExtensionEnv(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined')
    return false

  // Check if the browser is Firefox
  if (!/firefox/i.test(navigator.userAgent))
    return false

  // Check if it's Firefox extension page, e.g. popup, options page, etc.
  if (window.location.protocol === 'moz-extension:')
    return true

  // Check if it's content script
  const browserRuntimeId = (globalThis as any)?.browser?.runtime?.id
  if (typeof browserRuntimeId === 'string' && browserRuntimeId.length > 0)
    return true

  return false
}

export function registerFirefoxOutsideGuard(guard: FirefoxOutsideInteractionGuard): void {
  firefoxOutsideGuards.add(guard)
}

export function unregisterFirefoxOutsideGuard(guard: FirefoxOutsideInteractionGuard): void {
  firefoxOutsideGuards.delete(guard)
}

function shouldPreventByGuards(event: RadixLikeEvent): boolean {
  if (firefoxOutsideGuards.size === 0)
    return true

  for (const guard of firefoxOutsideGuards) {
    try {
      if (guard(event))
        return true
    }
    catch {
      return true
    }
  }

  return false
}

function stopEventChain(event: RadixLikeEvent | undefined, depth = 0): void {
  if (!event || depth > MAX_DEPTH)
    return

  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function')
    event.stopImmediatePropagation()

  const fromOriginal = event.originalEvent
  if (fromOriginal && fromOriginal !== event)
    stopEventChain(fromOriginal, depth + 1)

  const fromDetail = event.detail?.originalEvent
  if (fromDetail && fromDetail !== event && fromDetail !== fromOriginal)
    stopEventChain(fromDetail, depth + 1)
}

export function preventDismiss(event: Event): void {
  const radixEvent = event as RadixLikeEvent

  if (!shouldPreventByGuards(radixEvent))
    return

  stopEventChain(radixEvent)
}

export function getFirefoxPopupContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined')
    return undefined

  return document.getElementById('root') ?? undefined
}
