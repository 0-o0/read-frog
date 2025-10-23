'use client'

import type { FirefoxOutsideInteractionGuard } from '@/utils/firefox-compat'
import { Select } from '@repo/ui/components/select'
import * as React from 'react'

import { isFirefox, registerFirefoxOutsideGuard, unregisterFirefoxOutsideGuard } from '@/utils/firefox-compat'

const CLOSE_GUARD_TIMEOUT_MS = 250
const CLOSE_ALLOW_TIMEOUT_MS = 400

export function FirefoxSelect({
  open: openProp,
  defaultOpen,
  onOpenChange,
  onValueChange,
  children,
  ...rest
}: React.ComponentProps<typeof Select>) {
  const isFirefoxEnv = React.useMemo(() => isFirefox(), [])
  const isControlled = openProp !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false)
  const open = isControlled ? openProp : uncontrolledOpen
  const openRef = React.useRef(open)

  const justOpenedRef = React.useRef(false)
  const debounceTimeoutRef = React.useRef<number | undefined>(undefined)
  const allowCloseRef = React.useRef(false)
  const allowCloseTimeoutRef = React.useRef<number | undefined>(undefined)

  const grantClosePermission = React.useCallback(() => {
    allowCloseRef.current = true
    if (allowCloseTimeoutRef.current !== undefined)
      window.clearTimeout(allowCloseTimeoutRef.current)

    allowCloseTimeoutRef.current = window.setTimeout(() => {
      allowCloseRef.current = false
      allowCloseTimeoutRef.current = undefined
    }, CLOSE_ALLOW_TIMEOUT_MS)
  }, [])

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

  React.useEffect(() => {
    openRef.current = open
  }, [open])

  React.useEffect(() => () => {
    clearDebounce()
    clearAllowCloseTimeout()
  }, [clearAllowCloseTimeout, clearDebounce])

  const setOpenState = React.useCallback((next: boolean) => {
    if (!isControlled)
      setUncontrolledOpen(next)
  }, [isControlled])

  const handleFirefoxOpenChange = React.useCallback((next: boolean) => {
    if (next) {
      setOpenState(true)
      onOpenChange?.(true)
      justOpenedRef.current = true
      allowCloseRef.current = false
      clearDebounce()
      debounceTimeoutRef.current = window.setTimeout(() => {
        justOpenedRef.current = false
        debounceTimeoutRef.current = undefined
      }, CLOSE_GUARD_TIMEOUT_MS)
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
  }, [clearAllowCloseTimeout, clearDebounce, onOpenChange, setOpenState])

  const handleFirefoxValueChange = React.useCallback((value: string) => {
    grantClosePermission()
    onValueChange?.(value)
  }, [grantClosePermission, onValueChange])

  React.useEffect(() => {
    if (!isFirefoxEnv)
      return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target)
        return

      if (target.closest('[data-slot="select-trigger"]') || target.closest('[data-slot="select-item"]')) {
        grantClosePermission()
        return
      }

      if (!openRef.current)
        return

      if (justOpenedRef.current)
        return

      if (!target.closest('[data-slot="select-content"]'))
        grantClosePermission()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openRef.current) {
        grantClosePermission()
        event.stopPropagation()
        if (typeof event.stopImmediatePropagation === 'function')
          event.stopImmediatePropagation()
        event.preventDefault()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [grantClosePermission, isFirefoxEnv])

  React.useEffect(() => {
    if (!isFirefoxEnv)
      return

    const guard: FirefoxOutsideInteractionGuard = (_event) => {
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
  }, [isFirefoxEnv])

  if (!isFirefoxEnv) {
    if (isControlled) {
      return (
        <Select open={openProp} onOpenChange={onOpenChange} onValueChange={onValueChange} {...rest}>
          {children}
        </Select>
      )
    }

    return (
      <Select defaultOpen={defaultOpen} onOpenChange={onOpenChange} onValueChange={onValueChange} {...rest}>
        {children}
      </Select>
    )
  }

  return (
    <Select
      open={open}
      onOpenChange={handleFirefoxOpenChange}
      onValueChange={handleFirefoxValueChange}
      {...rest}
    >
      {children}
    </Select>
  )
}
