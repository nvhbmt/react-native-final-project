import { Tabs } from 'expo-router'

import { MarketplaceTabBar } from '@/components/navigation/MarketplaceTabBar'
import { TABS } from '@/navigation/tabs'

export default function TabsLayout() {
  return (
    <Tabs backBehavior="history" screenOptions={{ headerShown: false }} tabBar={(props) => <MarketplaceTabBar {...props} />}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
          }}
        />
      ))}
      {/* Custom tab bar omits this route. SDK 58 redirects routes with href: null. */}
      <Tabs.Screen name="product-listing" options={{ title: 'Sản phẩm' }} />
    </Tabs>
  )
}
