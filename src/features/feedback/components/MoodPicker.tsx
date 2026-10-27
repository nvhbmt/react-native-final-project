import { MaterialCommunityIcons } from '@expo/vector-icons'
import { View } from '@tamagui/tailwind'

import { appColors } from '@/theme/tamagui.config'

import type { Mood } from '../types'

const MOODS: { value: Mood; icon: 'emoticon-sad-outline' | 'emoticon-neutral-outline' | 'emoticon-happy-outline'; label: string }[] = [
  { value: 'sad', icon: 'emoticon-sad-outline', label: 'Không hài lòng' },
  { value: 'neutral', icon: 'emoticon-neutral-outline', label: 'Bình thường' },
  { value: 'happy', icon: 'emoticon-happy-outline', label: 'Hài lòng' },
]

type Props = {
  value: Mood | null
  onChange: (mood: Mood) => void
}

export function MoodPicker({ value, onChange }: Props) {
  return (
    <View className="flex-row items-center justify-center gap-6" role="radiogroup">
      {MOODS.map((m) => {
        const selected = m.value === value
        return (
          <View
            key={m.value}
            onPress={() => onChange(m.value)}
            role="radio"
            aria-checked={selected}
            aria-label={m.label}
            className="active:opacity-70"
          >
            <MaterialCommunityIcons
              name={m.icon}
              size={48}
              color={selected ? appColors.primary : appColors['neutral-500']}
            />
          </View>
        )
      })}
    </View>
  )
}
