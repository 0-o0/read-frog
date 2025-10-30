'use client'

import type { FirefoxOutsideInteractionGuard } from '../utils/firefox-compat'

import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '@repo/ui/lib/utils'

import { IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react'

import * as React from 'react'
import {
  getFirefoxPopupContainer,
  getIsFirefoxExtensionEnv,
  preventDismiss,
  registerFirefoxOutsideGuard,
  unregisterFirefoxOutsideGuard,
} from '../utils/firefox-compat'

function Select({
  open: openProp,
  defaultOpen,
  onOpenChange,
  onValueChange,
  children,
  ...rest
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  const isFirefoxEnv = React.useMemo(() => getIsFirefoxExtensionEnv(), [])

  const isControlled = openProp !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false)
  const open = isControlled ? openProp : uncontrolledOpen
  const openRef = React.useRef(open)

  const justOpenedRef = React.useRef(false)
  const debounceTimeoutRef = React.useRef<number | undefined>(undefined)
  const allowCloseRef = React.useRef(false)
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
    }, 400)
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
      }, 250)
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
  }, [isFirefoxEnv])

  if (isFirefoxEnv) {
    return (
      <SelectPrimitive.Root
        data-slot="select"
        open={open}
        onOpenChange={handleFirefoxOpenChange}
        onValueChange={handleFirefoxValueChange}
        {...rest}
      >
        {children}
      </SelectPrimitive.Root>

    )
  }

  return (
    <SelectPrimitive.Root
      data-slot="select"
      open={openProp}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      onValueChange={onValueChange}
      {...rest}
    >
      {children}
    </SelectPrimitive.Root>
  )
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = 'default',
  hideChevron = false,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default'
  hideChevron?: boolean
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        'cursor-pointer border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*=\'text-\'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-input/30 hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        className,
      )}
      {...props}
    >
      {children}
      {!hideChevron && (
        <SelectPrimitive.Icon>
          <IconChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      )}
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = 'popper',
  container,
  onPointerDownOutside,
  onCloseAutoFocus,
  collisionBoundary,
  disablePortal = false,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & {
  container?: HTMLElement | null
  collisionBoundary?: Element | Element[] | null
  disablePortal?: boolean
}) {
  const isFirefoxEnv = React.useMemo(() => getIsFirefoxExtensionEnv(), [])

  // Check if we're inside a shadow DOM
  const isInShadowDOM = React.useMemo(() => {
    if (typeof document === 'undefined')
      return false
    let node = document.activeElement
    while (node) {
      if (node instanceof ShadowRoot)
        return true
      node = (node as any).parentNode || (node as any).host
    }
    return false
  }, [])

  const pointerDownOutsideHandler = isFirefoxEnv
    ? (event: Event) => {
        preventDismiss(event)
        onPointerDownOutside?.(event as any)
      }
    : onPointerDownOutside

  const closeAutoFocusHandler = isFirefoxEnv
    ? (event: Event) => {
        preventDismiss(event)
        onCloseAutoFocus?.(event as any)
      }
    : onCloseAutoFocus

  const finalCollisionBoundary = isFirefoxEnv && isInShadowDOM
    ? (collisionBoundary ?? getFirefoxPopupContainer() ?? undefined)
    : collisionBoundary

  // Only disable portal if we're in Firefox AND inside shadow DOM
  const finalDisablePortal = (isFirefoxEnv && isInShadowDOM) ? true : disablePortal
  const finalContainer = container ?? undefined

  const content = (
    <SelectPrimitive.Content
      data-slot="select-content"
      className={cn(
        'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md',
        position === 'popper'
        && 'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        'z-[2147483647]',
        className,
      )}
      position={position}
      onPointerDownOutside={pointerDownOutsideHandler}
      onCloseAutoFocus={closeAutoFocusHandler}
      collisionBoundary={finalCollisionBoundary}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper'
          && 'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  )

  if (finalDisablePortal) {
    return content
  }

  return (
    <SelectPrimitive.Portal container={finalContainer}>
      {content}
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('text-muted-foreground px-2 py-1.5 text-xs', className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'focus:bg-accent focus:text-accent-foreground [&_svg:not([class*=\'text-\'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2',
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <IconCheck className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('bg-border pointer-events-none -mx-1 my-1 h-px', className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className,
      )}
      {...props}
    >
      <IconChevronUp className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className,
      )}
      {...props}
    >
      <IconChevronDown className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
