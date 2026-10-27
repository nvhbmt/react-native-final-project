import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { Switch } from 'react-native'

import { appColors } from '@/theme/tamagui.config'

type Props = {
  value: boolean
  onChange: (value: boolean) => void
}

export function NotifyCard({ value, onChange }: Props) {
  return (
    <View className="flex-row items-center gap-4 rounded-[6px] border border-neutral-300 px-3 py-3.5">
      <View className="size-[44px] items-center justify-center rounded-[4px] bg-primary">
        <Ionicons name="notifications-outline" size={22} color="#ffffff" />
      </View>
      <Text className="flex-1 text-[12px] leading-[20px] text-neutral-700">Notify me of promotions</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: appColors['neutral-400'], true: appColors.primary }}
        thumbColor="#ffffff"
        ios_backgroundColor={appColors['neutral-400']}
        accessibilityLabel="Notify me of promotions"
      />
    </View>
  )
}
