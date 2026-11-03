import type { KeyboardEvent } from 'react'

// Tamagui stacks handle pointer presses; supply keyboard activation on web too.
// Tamagui omits onKeyDown on native, where tabIndex enables accessibility.
export const keyboardAction = {
  tabIndex: 0,
  onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || event.repeat) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.currentTarget.click()
    }
  },
} as const
