import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'

import { appColors } from '@/theme/tamagui.config'

/** Mở trợ lý AI với ngữ cảnh là sản phẩm đang xem. */
export function AskAssistantLink({ productId }: { productId: string }) {
  return (
    <View
      onPress={() => router.push({ pathname: '/assistant', params: { productId } })}
      role="link"
      className="flex-row items-center gap-3 rounded-[8px] bg-[#f3f0ff] px-4 py-3 active:opacity-80"
    >
      <Ionicons name="sparkles" size={18} color={appColors.primary} />
      <Text className="flex-1 text-[14px] leading-[22px] text-neutral-800">Hỏi trợ lý AI về sản phẩm này</Text>
      <Ionicons name="chevron-forward" size={16} color={appColors['neutral-400']} />
    </View>
  )
}
