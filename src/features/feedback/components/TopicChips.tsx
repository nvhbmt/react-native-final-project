import { View } from '@tamagui/tailwind'

import { Chip } from '@/components/ui/Chip'

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
          <Chip
            key={topic}
            label={topic}
            selected={selected}
            icon={selected ? 'checkmark' : 'add'}
            onPress={() => toggle(topic)}
          />
        )
      })}
    </View>
  )
}
