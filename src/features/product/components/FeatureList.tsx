import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import type { ReactNode } from 'react'

import { appColors } from '@/theme/tamagui.config'

import type { ProductFeature } from '../types'

const ICON_SIZE = 16
const icons: Record<ProductFeature['icon'], ReactNode> = {
  express: <MaterialCommunityIcons name="truck-fast-outline" size={ICON_SIZE} color={appColors.primary} />,
  return: <Ionicons name="arrow-undo-outline" size={ICON_SIZE} color={appColors.primary} />,
  review: <Ionicons name="star-outline" size={ICON_SIZE} color={appColors.primary} />,
  authorized: <Ionicons name="ribbon-outline" size={ICON_SIZE} color={appColors.primary} />,
}

/** Lưới 2 cột: Express, 30-day free return... */
export function FeatureList({ features }: { features: ProductFeature[] }) {
  return (
    <View className="flex-row flex-wrap gap-y-4">
      {features.map((f) => (
        <View key={f.icon} className="w-1/2 flex-row items-center gap-[18px]">
          {icons[f.icon]}
          <Text className="text-[14px] leading-[22px] text-neutral-500">{f.label}</Text>
        </View>
      ))}
    </View>
  )
}
