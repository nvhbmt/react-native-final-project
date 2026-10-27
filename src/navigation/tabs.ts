import type { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

type IconName = ComponentProps<typeof Ionicons>['name']

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
  { name: 'search', title: 'Search', icon: 'search-outline', activeIcon: 'search' },
  { name: 'favorites', title: 'Favorites', icon: 'heart-outline', activeIcon: 'heart' },
  { name: 'inbox', title: 'Inbox', icon: 'chatbox-ellipses-outline', activeIcon: 'chatbox-ellipses' },
  { name: 'account', title: 'Account', icon: 'person-circle-outline', activeIcon: 'person-circle' },
]
