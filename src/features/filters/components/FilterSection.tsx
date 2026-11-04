import { Ionicons } from '@expo/vector-icons'
import { useState, type PropsWithChildren } from 'react'
import { XStack, YStack } from 'tamagui'

import { MarketHeading } from '@/components/marketplace/MarketText'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import { marketplace as m } from '@/theme/marketplace'

type Props = PropsWithChildren<{ title: string; first?: boolean; last?: boolean; top?: number; bottom?: number }>

export function FilterSection({ title, children, first, last, top, bottom }: Props) {
  const [expanded, setExpanded] = useState(true)
  return (
    <YStack pt={top ?? (first ? 16 : 20)} pb={bottom ?? (last ? 0 : 16)} borderBottomWidth={last ? 0 : 1} borderColor={m.starEmpty}>
      <XStack {...keyboardAction} role="button" aria-label={title} aria-expanded={expanded} onPress={() => setExpanded(!expanded)} items="center" justify="space-between" minH={26} hitSlop={5}>
        <MarketHeading fontSize={16} lineHeight="26px" color={m.ink}>{title}</MarketHeading>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={m.muted} />
      </XStack>
      {expanded && children}
    </YStack>
  )
}
