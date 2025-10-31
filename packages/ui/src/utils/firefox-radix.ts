import type { FirefoxOutsideInteractionGuard } from './firefox-compat'
import * as React from 'react'
import {

  getIsFirefoxExtensionEnv,
  registerFirefoxOutsideGuard,
  unregisterFirefoxOutsideGuard,
} from './firefox-compat'

interface Options {
  controlledOpen?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  isEnabled?: boolean
  triggerSelectors: string[]
  interactiveSelectors?: string[]
  contentSelector: string
}

interface Result {
  isFirefoxMode: boolean
  rootOpen: boolean | undefined
  rootDefaultOpen: boolean | undefined
  handleOpenChange: (open: boolean) => void
  grantClosePermission: () => void
}

const ESCAPE_KEY = 'Escape'
const CLOSE_PERMISSION_MS = 400
const JUST_OPENED_DEBOUNCE_MS = 250

function matchesAnySelector(target: Element, selectors: string[]): boolean {
  for (const selector of selectors) {
    if (!selector)
      continue
    if (target.closest(selector))
      return true
  }
  return false
}

export function useFirefoxRadixOpenController(options: Options): Result {
  const {
    controlledOpen,
    defaultOpen = false,
    onOpenChange,
    isEnabled = true,
    triggerSelectors,
    interactiveSelectors = [],
    contentSelector,
  } = options

  const isFirefoxEnv = React.useMemo(() => getIsFirefoxExtensionEnv(), [])
  const isFirefoxMode = isFirefoxEnv && isEnabled

  const isControlled = controlledOpen !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const openRef = React.useRef(open ?? false)
  const justOpenedRef = React.useRef(false)
  const allowCloseRef = React.useRef(false)
  const debounceTimeoutRef = React.useRef<number | undefined>(undefined)
  const allowCloseTimeoutRef = React.useRef<number | undefined>(undefined)

  const clearDebounce = React.useCallback(() => {
    if (debounceTimeoutRef.current !== undefined) {
      window.clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = undefined
    }
  }, [])

  const clearAllowCloseTimeout = React.useCallback(() => {
    if (allowCloseTimeoutRef.current !== undefined) {
      window.clearTimeout(allowCloseTimeoutRef.current)
      allowCloseTimeoutRef.current = undefined
    }
  }, [])

  const grantClosePermission = React.useCallback(() => {
    allowCloseRef.current = true
    if (allowCloseTimeoutRef.current !== undefined)
      window.clearTimeout(allowCloseTimeoutRef.current)

    allowCloseTimeoutRef.current = window.setTimeout(() => {
      allowCloseRef.current = false
      allowCloseTimeoutRef.current = undefined
    }, CLOSE_PERMISSION_MS)
  }, [])

  const setOpenState = React.useCallback((next: boolean) => {
    if (!isControlled)
      setUncontrolledOpen(next)
  }, [isControlled])

  const handleOpenChange = React.useCallback((next: boolean) => {
    if (!isFirefoxMode) {
      onOpenChange?.(next)
      setOpenState(next)
      return
    }

    if (next) {
      justOpenedRef.current = true
      allowCloseRef.current = false
      clearAllowCloseTimeout()
      clearDebounce()
      setOpenState(true)
      onOpenChange?.(true)
      debounceTimeoutRef.current = window.setTimeout(() => {
        justOpenedRef.current = false
        debounceTimeoutRef.current = undefined
      }, JUST_OPENED_DEBOUNCE_MS)
      return
    }

    if (justOpenedRef.current || !allowCloseRef.current) {
      setOpenState(true)
      return
    }

    allowCloseRef.current = false
    clearAllowCloseTimeout()
    setOpenState(false)
    onOpenChange?.(false)
  }, [clearAllowCloseTimeout, clearDebounce, isFirefoxMode, onOpenChange, setOpenState])

  React.useEffect(() => {
    openRef.current = open ?? false
  }, [open])

  React.useEffect(() => {
    if (!isFirefoxMode)
      return

    return () => {
      clearDebounce()
      clearAllowCloseTimeout()
    }
  }, [clearAllowCloseTimeout, clearDebounce, isFirefoxMode])

  React.useEffect(() => {
    if (!isFirefoxMode)
      return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target)
        return

      if (matchesAnySelector(target, triggerSelectors) || matchesAnySelector(target, interactiveSelectors)) {
        grantClosePermission()
        return
      }

      if (!openRef.current)
        return

      if (justOpenedRef.current)
        return

      if (!target.closest(contentSelector))
        grantClosePermission()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ESCAPE_KEY)
        return

      if (!openRef.current)
        return

      grantClosePermission()
      event.stopPropagation()
      if (typeof event.stopImmediatePropagation === 'function')
        event.stopImmediatePropagation()
      event.preventDefault()
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contentSelector, grantClosePermission, interactiveSelectors, isFirefoxMode, triggerSelectors])

  React.useEffect(() => {
    if (!isFirefoxMode)
      return

    const guard: FirefoxOutsideInteractionGuard = () => {
      if (!openRef.current)
        return false

      if (justOpenedRef.current)
        return true

      if (!allowCloseRef.current)
        return true

      return false
    }

    registerFirefoxOutsideGuard(guard)

    return () => {
      unregisterFirefoxOutsideGuard(guard)
    }
  }, [isFirefoxMode])

  return {
    isFirefoxMode,
    rootOpen: isFirefoxMode ? (open ?? false) : controlledOpen,
    rootDefaultOpen: isFirefoxMode ? undefined : defaultOpen,
    handleOpenChange,
    grantClosePermission,
  }
}
