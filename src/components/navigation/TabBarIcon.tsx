import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

type Props = {
  name: ComponentProps<typeof MaterialCommunityIcons>['name']
  color: string
  size?: number
}

export function TabBarIcon({ name, color, size = 24 }: Props) {
  return <MaterialCommunityIcons name={name} color={color} size={size} />
}
