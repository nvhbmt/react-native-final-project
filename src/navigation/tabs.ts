import type { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export type TabConfig = {
  /** Tên file route trong `src/app/(tabs)/` */
  name: string
  title: string
  icon: IconName
  activeIcon: IconName
}

// Thêm/bớt/sắp xếp tab ở đây — layout đọc mảng này để dựng menu.
export const TABS: TabConfig[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'search', title: 'Search', icon: 'magnify', activeIcon: 'magnify' },
  { name: 'favorites', title: 'Favorites', icon: 'heart-outline', activeIcon: 'heart' },
  { name: 'inbox', title: 'Inbox', icon: 'message-text-outline', activeIcon: 'message-text' },
  { name: 'account', title: 'Account', icon: 'account-circle-outline', activeIcon: 'account-circle' },
]
