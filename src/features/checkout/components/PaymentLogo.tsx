import { Text, View } from '@tamagui/tailwind'

import type { PaymentBrand } from '../types'

type Props = {
  brand: PaymentBrand
  size?: number
}

/** Logo phương thức thanh toán vẽ bằng View/Text (không phụ thuộc file ảnh thương hiệu). */
export function PaymentLogo({ brand, size = 36 }: Props) {
  if (brand === 'paypal') {
    return (
      <View className="flex-row" style={{ width: size * 1.45 }}>
        <Text className="text-[15px] leading-[22px] font-bold italic text-[#253b80]">Pay</Text>
        <Text className="text-[15px] leading-[22px] font-bold italic text-[#179bd7]">Pal</Text>
      </View>
    )
  }

  if (brand === 'mastercard') {
    const dot = size * 0.36
    return (
      <View
        className="items-center justify-center overflow-hidden rounded-full bg-[#0a3a7c]"
        style={{ width: size, height: size }}
      >
        <View className="flex-row">
          <View className="rounded-full bg-[#eb001b]" style={{ width: dot, height: dot }} />
          <View className="rounded-full bg-[#00a2e5] opacity-90" style={{ width: dot, height: dot, marginLeft: -dot * 0.35 }} />
        </View>
      </View>
    )
  }

  // Visa: dải xanh trên, chữ VISA trên nền trắng, dải cam dưới.
  return (
    <View
      className="overflow-hidden rounded-full border border-neutral-200 bg-white"
      style={{ width: size, height: size }}
    >
      <View className="bg-[#1a1f71]" style={{ height: size * 0.28 }} />
      <View className="flex-1 items-center justify-center">
        <Text className="font-bold italic text-[#1a1f71]" style={{ fontSize: size * 0.27, lineHeight: size * 0.36 }}>
          VISA
        </Text>
      </View>
      <View className="bg-[#f7a823]" style={{ height: size * 0.28 }} />
    </View>
  )
}
