import { Text, View } from '@tamagui/tailwind'
import { useState } from 'react'
import { TextInput } from 'react-native'

import { cn } from '@/lib/cn'
import { appColors, bodyFontFamily } from '@/theme/tamagui.config'

import { useCartStore } from '../store/cartStore'

export function VoucherField() {
  const voucher = useCartStore((s) => s.voucher)
  const applyVoucher = useCartStore((s) => s.applyVoucher)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const canApply = code.trim().length > 0

  const [applying, setApplying] = useState(false)
  const apply = async () => {
    if (!canApply || applying) return
    setApplying(true)
    const ok = await applyVoucher(code)
    setApplying(false)
    setError(ok ? null : 'Mã giảm giá không hợp lệ')
    if (ok) setCode('')
  }

  return (
    <View className="gap-1">
      <Text className="text-[14px] leading-[22px] text-neutral-700">Voucher</Text>
      <View className="flex-row items-center gap-4">
        <TextInput
          value={code}
          onChangeText={(t) => {
            setCode(t)
            setError(null)
          }}
          onSubmitEditing={apply}
          placeholder="Enter voucher code"
          placeholderTextColor={appColors['neutral-400']}
          autoCapitalize="characters"
          returnKeyType="done"
          accessibilityLabel="Mã giảm giá"
          style={{
            flex: 1,
            height: 36,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderRadius: 4,
            borderColor: error ? appColors.danger : appColors['neutral-400'],
            fontFamily: bodyFontFamily,
            fontSize: 14,
            color: appColors['neutral-900'],
          }}
        />
        <View
          onPress={apply}
          role="button"
          aria-disabled={!canApply || applying}
          className={cn('h-[36px] w-[61px] items-center justify-center rounded-[4px]', canApply ? 'bg-secondary-50 active:opacity-70' : 'bg-secondary-25')}
        >
          <Text className={cn('text-[14px] leading-[22px]', canApply ? 'text-secondary' : 'text-secondary-300')}>Apply</Text>
        </View>
      </View>
      {error ? <Text className="text-[12px] leading-[20px] text-danger">{error}</Text> : null}
      {voucher ? (
        <Text className="text-[12px] leading-[20px] text-success-700">
          Đã áp dụng {voucher.code} (-{Math.round(voucher.rate * 100)}%)
        </Text>
      ) : null}
    </View>
  )
}
