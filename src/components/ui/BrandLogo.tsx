import { Text, View } from '@tamagui/tailwind'
import { Image } from 'expo-image'

const LOGO = require('../../../assets/logo.png')

/** Logo MobiMart (biểu tượng + tên) dùng ở các màn xác thực. */
export function BrandLogo({ size = 64 }: { size?: number }) {
  return (
    <View className="items-center gap-2" role="img" aria-label="MobiMart">
      <Image source={LOGO} style={{ width: size, height: size }} contentFit="contain" />
      <Text className="font-heading text-[22px] leading-[30px] font-bold text-neutral-900">
        Mobi<Text className="font-heading text-[22px] leading-[30px] font-bold text-primary">Mart</Text>
      </Text>
    </View>
  )
}
