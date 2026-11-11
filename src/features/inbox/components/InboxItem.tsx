import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'
import { appColors } from '@/theme/tamagui.config'

import type { InboxMessage } from '../store/inboxStore'

const icons: Record<InboxMessage['kind'], ComponentProps<typeof Ionicons>['name']> = {
  order: 'bag-check-outline',
  payment: 'card-outline',
  feedback: 'chatbox-ellipses-outline',
  system: 'notifications-outline',
}

function timeAgo(timestamp: number) {
  const minutes = Math.floor((Date.now() - timestamp) / 60_000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  return new Date(timestamp).toLocaleDateString('vi-VN')
}

export function InboxItem({ message, onPress }: { message: InboxMessage; onPress: () => void }) {
  return (
    <View onPress={onPress} role="button" aria-label={message.title} className={cn('flex-row gap-3 px-6 py-3 active:opacity-70', !message.read && 'bg-[#f3f0ff]')}>
      <View className="size-[40px] items-center justify-center rounded-full bg-neutral-100">
        <Ionicons name={icons[message.kind]} size={20} color={appColors.primary} />
      </View>
      <View className="flex-1 gap-[2px]">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className={cn('flex-1 text-[14px] leading-[22px] text-neutral-900', !message.read && 'font-bold')}>{message.title}</Text>
          {!message.read ? <View className="size-[8px] rounded-full bg-badge" /> : null}
        </View>
        <Text numberOfLines={2} className="text-[13px] leading-[20px] text-neutral-600">{message.body}</Text>
        <Text className="text-[11px] leading-[18px] text-neutral-400">{timeAgo(message.createdAt)}</Text>
      </View>
    </View>
  )
}
