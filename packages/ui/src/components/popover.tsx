'use client'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@repo/ui/lib/utils'
import * as React from 'react'

import {
  getFirefoxExtensionRoot,
  getIsFirefoxExtensionEnv,
  preventDismiss,
} from '../utils/firefox-compat'

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

function PopoverContent({
  ref,
  className,
  align = 'center',
  sideOffset = 4,
  container,
  onPointerDownOutside,
  onOpenAutoFocus,
  collisionBoundary,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
  ref?: React.RefObject<React.ComponentRef<typeof PopoverPrimitive.Content> | null>
  container?: HTMLElement | null
}) {
  const isFirefoxExtensionEnv = React.useMemo(() => getIsFirefoxExtensionEnv(), [])

  const pointerDownOutsideHandler = isFirefoxExtensionEnv
    ? (event: Event) => {
        preventDismiss(event)
        onPointerDownOutside?.(event as any)
      }
    : onPointerDownOutside

  const openAutoFocusHandler = isFirefoxExtensionEnv
    ? (event: Event) => {
        preventDismiss(event)
        onOpenAutoFocus?.(event as any)
      }
    : onOpenAutoFocus

  const popupContainer = React.useMemo(
    () => getFirefoxExtensionRoot() ?? undefined,
    [],
  )

  const finalContainer = container ?? (isFirefoxExtensionEnv ? popupContainer : undefined)
  const finalCollisionBoundary = isFirefoxExtensionEnv
    ? (collisionBoundary ?? popupContainer)
    : collisionBoundary

  return (
    <PopoverPrimitive.Portal container={finalContainer}>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        side="bottom"
        className={cn(
          'z-50 min-w-[220px] max-w-[98vw] rounded-lg border bg-fd-popover p-2 text-sm text-fd-popover-foreground shadow-lg focus-visible:outline-none data-[state=closed]:animate-fd-popover-out data-[state=open]:animate-fd-popover-in',
          className,
        )}
        onPointerDownOutside={pointerDownOutsideHandler}
        onOpenAutoFocus={openAutoFocusHandler}
        collisionBoundary={finalCollisionBoundary}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
PopoverContent.displayName = PopoverPrimitive.Content.displayName

const PopoverClose = PopoverPrimitive.PopoverClose

export { Popover, PopoverClose, PopoverContent, PopoverTrigger }
