import type { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack, YStack } from 'tamagui'

import { MarketText } from '@/components/marketplace/MarketText'
import { useUnreadCount } from '@/features/inbox'
import { TABS } from '@/navigation/tabs'
import { marketplace as m } from '@/theme/marketplace'

import { TabBarIcon } from './TabBarIcon'

type Props = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0]

export function MarketplaceTabBar({ state, emitter, navigateToTab }: Props) {
  const insets = useSafeAreaInsets()
  const current = state.routes[state.index].name
  const currentParams = state.routes[state.index].params as { category?: string } | undefined
  const isFruit = current === 'product-listing' && currentParams?.category === 'fruits'
  const unread = useUnreadCount()
  // Listing is part of browsing, so Home remains highlighted on its hidden route.
  const active = current === 'product-listing' ? 'index' : current

  return (
    <XStack role="tablist" bg="white" borderTopWidth={1} borderColor={m.border} pt={10} pb={Math.max(insets.bottom, 32)}>
      {TABS.map((tab) => {
        const route = state.routes.find((item) => item.name === tab.name)
        const focused = active === tab.name
        const color = focused ? m.primary : m.secondary
        return (
          <YStack key={tab.name} flex={1} minH={44} items="center" justify="center" gap={2} role="tab" aria-label={tab.title} aria-selected={focused} onPress={() => {
            if (!route) return
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!event.defaultPrevented) navigateToTab(route.key)
          }}>
            <YStack position="relative">
              <TabBarIcon name={tab.icon} color={color} size={26} />
              {((tab.name === 'favorites' && !isFruit) || (tab.name === 'inbox' && isFruit && unread > 0)) && <YStack position="absolute" t={-3} l={15} bg="#f04452" rounded={8} px={3} borderWidth={1} borderColor="white"><MarketText fontSize={9} lineHeight="13px" color="white" fontWeight="700">{tab.name === 'favorites' ? '99+' : unread}</MarketText></YStack>}
            </YStack>
            <MarketText fontSize={10} lineHeight="16px" color={color} fontWeight={focused ? '600' : '400'}>{tab.title}</MarketText>
          </YStack>
        )
      })}
    </XStack>
  )
}
