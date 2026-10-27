import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'

import { cn } from '@/lib/cn'
import { appColors } from '@/theme/tamagui.config'

import type { FeedbackTopic } from '../types'

export const FEEDBACK_TOPICS: FeedbackTopic[] = ['Service', 'Quantity', 'Payment', 'Delivery', 'Promotion', 'Gift']

type Props = {
  value: FeedbackTopic[]
  onChange: (topics: FeedbackTopic[]) => void
}

export function TopicChips({ value, onChange }: Props) {
  const toggle = (topic: FeedbackTopic) =>
    onChange(value.includes(topic) ? value.filter((t) => t !== topic) : [...value, topic])

  return (
    <View className="flex-row flex-wrap justify-center gap-x-1.5 gap-y-2 px-[50px]">
      {FEEDBACK_TOPICS.map((topic) => {
        const selected = value.includes(topic)
        return (
          <View
            key={topic}
            onPress={() => toggle(topic)}
            role="checkbox"
            aria-checked={selected}
            className={cn('h-[36px] flex-row items-center gap-1.5 rounded-full px-3 active:opacity-70', selected ? 'bg-primary-50' : 'bg-neutral-200')}
          >
            <Text className={cn('text-[14px] leading-[22px]', selected ? 'text-primary' : 'text-neutral-700')}>{topic}</Text>
            <Ionicons
              name={selected ? 'checkmark' : 'add'}
              size={18}
              color={selected ? appColors.primary : appColors['neutral-700']}
            />
          </View>
        )
      })}
    </View>
  )
}
