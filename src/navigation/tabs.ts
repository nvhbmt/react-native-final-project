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
  { name: 'index', title: 'Trang chủ', icon: 'home-outline', activeIcon: 'home' },
  { name: 'search', title: 'Tìm kiếm', icon: 'magnify', activeIcon: 'magnify' },
  { name: 'favorites', title: 'Yêu thích', icon: 'heart-outline', activeIcon: 'heart' },
  { name: 'inbox', title: 'Hộp thư', icon: 'message-text-outline', activeIcon: 'message-text' },
  { name: 'account', title: 'Tài khoản', icon: 'account-circle-outline', activeIcon: 'account-circle' },
]
