import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'

import { appColors } from '@/theme/tamagui.config'

/** Một dòng thông tin chuyển khoản, chạm biểu tượng để sao chép. */
export function CopyRow({ label, value, copyValue, highlight }: { label: string; value: string; copyValue?: string; highlight?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await Clipboard.setStringAsync(copyValue ?? value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <View className="flex-row items-center gap-3 py-2">
      <View className="flex-1 gap-[2px]">
        <Text className="text-[12px] leading-[18px] text-neutral-500">{label}</Text>
        <Text selectable className={highlight ? 'text-[16px] leading-[24px] font-bold text-primary' : 'text-[15px] leading-[24px] text-neutral-900'}>{value}</Text>
      </View>
      <View onPress={copy} role="button" aria-label={`Sao chép ${label}`} hitSlop={8} className="active:opacity-60">
        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? appColors.success : appColors['neutral-500']} />
      </View>
    </View>
  )
}
