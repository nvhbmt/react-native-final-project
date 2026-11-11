import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'

import { appColors } from '@/theme/tamagui.config'

import type { ShippingAddress } from '../types'

/** Khối "Giao đến" hiển thị địa chỉ đã chụp trong đơn. */
export function ShippingAddressCard({ address }: { address: ShippingAddress }) {
  return (
    <View className="flex-row gap-3 rounded-[6px] border border-neutral-300 p-4">
      <Ionicons name="location-outline" size={20} color={appColors.primary} />
      <View className="flex-1 gap-[2px]">
        <Text className="text-[12px] leading-[18px] font-semibold uppercase text-neutral-500">Giao đến</Text>
        <Text className="text-[14px] leading-[22px] font-bold text-neutral-900">
          {address.recipientName} · {address.phone}
        </Text>
        <Text className="text-[14px] leading-[22px] text-neutral-600">{address.line1}, {address.city}</Text>
      </View>
    </View>
  )
}
