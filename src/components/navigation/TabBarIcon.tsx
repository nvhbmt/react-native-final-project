import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

type Props = {
  name: ComponentProps<typeof Ionicons>['name']
  color: string
  size?: number
}

export function TabBarIcon({ name, color, size = 24 }: Props) {
  return <Ionicons name={name} color={color} size={size} />
}
