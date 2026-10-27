import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from 'tamagui'

import { TabBarIcon } from '@/components/navigation/TabBarIcon'
import { useUnreadCount } from '@/features/inbox/hooks/useUnreadCount'
import { TABS } from '@/navigation/tabs'
import { appColors } from '@/theme/tamagui.config'

const TAB_BAR_HEIGHT = 64

export default function TabsLayout() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const unread = useUnreadCount()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: appColors.primary,
        tabBarInactiveTintColor: appColors.muted,
        // Chiều cao mặc định (49) không đủ cho icon + nhãn 12px; cộng thêm inset đáy (home indicator).
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
          backgroundColor: theme.background.val,
          borderTopColor: theme['border-color'].val,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? tab.activeIcon : tab.icon} color={color as string} />
            ),
            ...(tab.name === 'inbox' && unread > 0
              ? {
                  tabBarBadge: unread > 99 ? '99+' : unread,
                  tabBarBadgeStyle: { backgroundColor: appColors.badge, color: '#fff' },
                }
              : null),
          }}
        />
      ))}
    </Tabs>
  )
}
