import { View } from '@tamagui/tailwind'

import { cn } from '@/lib/cn'

/** Đường kẻ 1px. Mặc định màu neutral-200; truyền className để đổi màu/khoảng cách. */
export function Divider({ className = 'bg-neutral-200' }: { className?: string }) {
  return <View className={cn('h-px w-full', className)} />
}
