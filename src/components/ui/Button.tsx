import { Ionicons } from '@expo/vector-icons'
import { styled, Text, View } from '@tamagui/tailwind'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { appColors } from '@/theme/tamagui.config'

type IconName = ComponentProps<typeof Ionicons>['name']
type Variant = 'primary' | 'outline' | 'text'

const ButtonFrame = styled(
  View,
  'h-[44px] flex-row items-center justify-center gap-2 rounded-[4px] px-4 active:opacity-80',
  {
    variants: {
      variant: {
        primary: 'bg-primary',
        outline: 'border border-primary bg-white',
        text: 'bg-transparent',
      },
      disabled: {
        true: 'opacity-50',
      },
    },
  },
)

const labelClass: Record<Variant, string> = {
  primary: 'text-white',
  outline: 'text-primary',
  text: 'text-primary',
}

const iconColor: Record<Variant, string> = {
  primary: '#ffffff',
  outline: appColors.primary,
  text: appColors.primary,
}

type Props = {
  title?: string
  variant?: Variant
  leftIcon?: IconName
  rightIcon?: IconName
  onPress?: () => void
  disabled?: boolean
  className?: string
  children?: ReactNode
}

export function Button({
  title,
  variant = 'primary',
  leftIcon,
  rightIcon,
  onPress,
  disabled,
  className,
  children,
}: Props) {
  return (
    <ButtonFrame
      variant={variant}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      role="button"
      aria-disabled={disabled}
      className={className}
    >
      {leftIcon ? <Ionicons name={leftIcon} size={20} color={iconColor[variant]} /> : null}
      {title ? (
        <Text className={cn('text-[16px] leading-[26px] font-medium', labelClass[variant])}>{title}</Text>
      ) : null}
      {children}
      {rightIcon ? <Ionicons name={rightIcon} size={20} color={iconColor[variant]} /> : null}
    </ButtonFrame>
  )
}
