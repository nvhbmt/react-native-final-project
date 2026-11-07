import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'

import { appColors } from '@/theme/tamagui.config'

/** Thông báo lỗi chung của form (sai mật khẩu, mất mạng...). */
export function FormBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <View role="alert" className="flex-row items-start gap-2 rounded-[6px] bg-[#fdf2f2] p-3">
      <Ionicons name="alert-circle" size={18} color={appColors.danger} />
      <Text className="flex-1 text-[14px] leading-[22px] text-danger">{message}</Text>
    </View>
  )
}
