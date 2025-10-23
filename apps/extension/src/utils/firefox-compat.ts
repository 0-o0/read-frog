/**
 * Firefox WebExtension Compatibility Utilities
 */

export function isFirefox(): boolean {
  const result = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent)
  return result
}

/**
 * Event handler to prevent dismissal on outside interactions
 * Use this for Radix UI components in Firefox WebExtension popups
 */
interface RadixLikeEvent extends Event {
  originalEvent?: RadixLikeEvent
  detail?: {
    originalEvent?: RadixLikeEvent
  }
}

type OutsideInteractionGuard = (event: RadixLikeEvent) => boolean

export type FirefoxOutsideInteractionGuard = OutsideInteractionGuard

const firefoxOutsideGuards = new Set<OutsideInteractionGuard>()

export function registerFirefoxOutsideGuard(guard: OutsideInteractionGuard): void {
  firefoxOutsideGuards.add(guard)
}

export function unregisterFirefoxOutsideGuard(guard: OutsideInteractionGuard): void {
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
  if (!event || depth > 10)
    return

  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function')
    event.stopImmediatePropagation()

  const fromOriginal = event.originalEvent
  if (fromOriginal && fromOriginal !== event) {
    stopEventChain(fromOriginal, depth + 1)
  }

  const fromDetail = event.detail?.originalEvent
  if (fromDetail && fromDetail !== event && fromDetail !== fromOriginal) {
    stopEventChain(fromDetail, depth + 1)
  }
}

export function preventDismiss(event: Event): void {
  const radixEvent = event as RadixLikeEvent

  if (!shouldPreventByGuards(radixEvent))
    return

  stopEventChain(radixEvent)
}

/**
 * Get the root container for Portal components in extension popup
 * Falls back to document.body if root not found
 */
export function getPopupPortalContainer(): HTMLElement | undefined {
  const root = document.getElementById('root')
  return root ?? undefined
}

/**
 * Get Firefox-specific props for Radix Select.Content
 * These props prevent the "instant close" bug in Firefox popup
 */
export function getFirefoxSelectContentProps() {
  const isFx = isFirefox()

  if (!isFx) {
    return {}
  }

  const props = {
    disablePortal: true,
    position: 'popper' as const,
    onPointerDownOutside: (e: Event) => {
      preventDismiss(e)
    },
    onCloseAutoFocus: (e: Event) => {
      preventDismiss(e)
    },
    onFocusOutside: (e: Event) => {
      preventDismiss(e)
    },
    onInteractOutside: (e: Event) => {
      preventDismiss(e)
    },
    collisionBoundary: getPopupPortalContainer() ?? undefined,
  }
  return props
}

/**
 * Get Firefox-specific props for Radix DropdownMenu.Content
 */
export function getFirefoxDropdownContentProps() {
  if (!isFirefox()) {
    return {}
  }

  const container = getPopupPortalContainer()

  return {
    container,
    collisionBoundary: container,
    onFocusOutside: preventDismiss,
    onInteractOutside: preventDismiss,
  }
}

/**
 * Get Firefox-specific props for Radix Popover.Content
 */
export function getFirefoxPopoverContentProps() {
  if (!isFirefox()) {
    return {}
  }

  const container = getPopupPortalContainer()

  return {
    container,
    collisionBoundary: container,
    onPointerDownOutside: preventDismiss,
    onOpenAutoFocus: preventDismiss,
  }
}
