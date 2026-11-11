import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'

import { cn } from '@/lib/cn'
import { selectableText } from '@/lib/selectableText'
import { appColors } from '@/theme/tamagui.config'

import type { ChatMessage } from '../api/assistantApi'
import { splitProductLinks } from '../lib/sse'

type Props = { message: ChatMessage; activity?: string | null; onRate?: (rating: 1 | -1) => void }

export function MessageBubble({ message, activity, onRate }: Props) {
  const mine = message.role === 'user'
  const parts = splitProductLinks(message.content)
  return (
    <View className={cn('max-w-[85%] gap-1', mine ? 'self-end' : 'self-start')}>
      <View className={cn('rounded-[14px] px-3 py-2', mine ? 'rounded-br-[4px] bg-primary' : 'rounded-bl-[4px] bg-neutral-100')}>
        {message.content ? (
          <Text {...selectableText} className={cn('text-[14px] leading-[22px]', mine ? 'text-white' : 'text-neutral-900')}>
            {parts.map((part, i) => part.type === 'text' ? part.text : (
              <Text
                key={i}
                role="link"
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: part.id } })}
                className="font-bold text-primary underline"
              >
                Xem sản phẩm
              </Text>
            ))}
          </Text>
        ) : (
          <Text className="text-[13px] italic leading-[20px] text-neutral-500">{activity ?? 'Đang trả lời…'}</Text>
        )}
        {message.content && activity ? <Text className="pt-1 text-[12px] italic text-neutral-500">{activity}</Text> : null}
      </View>
      {!mine && message.status === 'stopped' ? <Text className="text-[11px] text-neutral-400">Đã dừng</Text> : null}
      {!mine && message.status === 'error' ? <Text className="text-[11px] text-danger">Trả lời bị lỗi</Text> : null}
      {!mine && onRate && message.status !== 'streaming' && message.content ? (
        <View className="flex-row gap-3 pl-1">
          {([1, -1] as const).map((value) => (
            <View key={value} onPress={() => onRate(value)} role="button" aria-label={value === 1 ? 'Hữu ích' : 'Không hữu ích'} aria-pressed={message.rating === value} hitSlop={6}>
              <Ionicons
                name={value === 1 ? (message.rating === 1 ? 'thumbs-up' : 'thumbs-up-outline') : (message.rating === -1 ? 'thumbs-down' : 'thumbs-down-outline')}
                size={14}
                color={message.rating === value ? appColors.primary : appColors['neutral-400']}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
