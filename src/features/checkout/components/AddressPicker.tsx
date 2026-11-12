import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'

import { Button } from '@/components/ui/Button'
import type { Address } from '@/features/account'
import { cn } from '@/lib/cn'

type Props = {
  addresses: Address[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Chọn địa chỉ giao hàng từ sổ địa chỉ; thêm/sửa ở màn Địa chỉ giao hàng. */
export function AddressPicker({ addresses, selectedId, onSelect }: Props) {
  if (!addresses.length) {
    return (
      <View className="gap-3 rounded-[6px] border border-dashed border-neutral-400 p-4">
        <Text className="text-[14px] leading-[22px] text-neutral-600">Bạn chưa có địa chỉ giao hàng. Thêm địa chỉ để đặt hàng.</Text>
        <Button title="Thêm địa chỉ" variant="outline" leftIcon="add" onPress={() => router.push('/addresses')} />
      </View>
    )
  }

  return (
    <View className="gap-3" role="radiogroup" aria-label="Địa chỉ giao hàng">
      {addresses.map((address) => {
        const selected = address.id === selectedId
        return (
          <View
            key={address.id}
            onPress={() => onSelect(address.id)}
            role="radio"
            aria-checked={selected}
            aria-label={`${address.recipientName}, ${address.line1}, ${address.city}`}
            className={cn('flex-row items-center gap-3 rounded-[4px] border px-4 py-3 active:opacity-80', selected ? 'border-primary' : 'border-neutral-300')}
          >
            <View className="flex-1 gap-[2px]">
              <View className="flex-row items-center gap-2">
                <Text className="text-[14px] leading-[22px] font-bold text-neutral-900">{address.recipientName}</Text>
                {address.isDefault ? <Text className="rounded-full bg-primary px-2 text-[11px] leading-[18px] text-white">Mặc định</Text> : null}
              </View>
              <Text className="text-[13px] leading-[20px] text-neutral-600">{address.phone}</Text>
              <Text className="text-[13px] leading-[20px] text-neutral-600">{address.line1}, {address.city}</Text>
            </View>
            <View className={cn('size-[16px] items-center justify-center rounded-full border', selected ? 'border-primary' : 'border-neutral-600')}>
              {selected ? <View className="size-[8px] rounded-full bg-primary" /> : null}
            </View>
          </View>
        )
      })}
      <Text role="link" onPress={() => router.push('/addresses')} className="self-start text-[13px] leading-[20px] font-bold text-primary">
        Thêm hoặc sửa địa chỉ
      </Text>
    </View>
  )
}
