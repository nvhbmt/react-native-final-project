import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'

import { AppHeader } from '@/components/ui/AppHeader'
import { Screen } from '@/components/ui/Screen'
import { cn } from '@/lib/cn'
import { appColors } from '@/theme/tamagui.config'

import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { ProductStatus } from '../components/ProductStatus'
import { useRouteProduct } from '../hooks/useRouteProduct'

type Unit = 'cm' | 'in'

const MEASURE_TIPS = [
  { title: 'Chest', desc: 'Measure around the fullest part of your chest, keeping the tape level and snug.' },
  { title: 'Waist', desc: 'Measure around the narrowest part of your waist, just above the belly button.' },
  { title: 'Length', desc: 'Measure from the highest point of the shoulder down to the hem.' },
]

const toUnit = (cm: number, unit: Unit) => (unit === 'cm' ? String(cm) : (cm / 2.54).toFixed(1))

export function SizeGuideScreen() {
  const { product, ...request } = useRouteProduct()
  const { size } = useLocalSearchParams<{ size?: string }>()
  const [unit, setUnit] = useState<Unit>('cm')
  const [selected, setSelected] = useState(size)

  if (!product) return <ProductStatus title="Size guide" {...request} />
  if (!product.sizeChart) return <Screen header={<AppHeader title="Size guide" />}><CatalogStatus message="No size guide available." /></Screen>
  const { columns, rows } = product.sizeChart
  const tips = MEASURE_TIPS.filter((tip) => columns.some((column) => column.key === tip.title.toLowerCase()))

  return (
    <Screen header={<AppHeader title="Size guide" />} contentClassName="gap-6 px-6 pt-2 pb-6" safeBottom>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 gap-1">
          <Text className="font-heading text-[18px] leading-[28px] font-bold text-neutral-700">{product.name}</Text>
          <Text className="text-[12px] leading-[20px] text-neutral-600">Measurements by size</Text>
        </View>
        {/* Đổi đơn vị cm / inch */}
        <View className="flex-row overflow-hidden rounded-[4px] border border-neutral-500" role="radiogroup">
          {(['cm', 'in'] as const).map((u, i) => (
            <View
              key={u}
              onPress={() => setUnit(u)}
              role="radio"
              aria-checked={unit === u}
              className={cn(
                'h-[32px] w-[44px] items-center justify-center',
                i > 0 && 'border-l border-neutral-500',
                unit === u ? 'bg-primary' : 'bg-white',
              )}
            >
              <Text className={cn('text-[14px] leading-[22px]', unit === u ? 'font-bold text-white' : 'text-neutral-500')}>
                {u}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="overflow-hidden rounded-[6px] border border-neutral-300">
        <View className="h-[44px] flex-row items-center bg-neutral-100">
          <Text className="flex-1 pl-4 text-[14px] leading-[22px] font-bold text-neutral-700">Size</Text>
          {columns.map((c) => (
            <Text key={c.key} className="flex-1 text-center text-[14px] leading-[22px] font-bold text-neutral-700">
              {c.label}
            </Text>
          ))}
        </View>
        {rows.map((row) => {
          const active = row.size === selected
          return (
            <View
              key={row.size}
              onPress={() => setSelected(row.size)}
              role="radio"
              aria-checked={active}
              className={cn('h-[48px] flex-row items-center border-t border-neutral-300', active && 'bg-primary-50')}
            >
              <Text className={cn('flex-1 pl-4 text-[14px] leading-[22px]', active ? 'font-bold text-primary' : 'text-neutral-700')}>
                {row.size}
              </Text>
              {columns.map((c) => (
                <Text
                  key={c.key}
                  className={cn('flex-1 text-center text-[14px] leading-[22px]', active ? 'font-bold text-primary' : 'text-neutral-600')}
                >
                  {toUnit(row.cm[c.key], unit)}
                </Text>
              ))}
            </View>
          )
        })}
      </View>

      {tips.length > 0 && <View className="gap-4">
        <Text className="font-heading text-[18px] leading-[28px] font-bold text-neutral-700">How to measure</Text>
        {tips.map((tip) => (
          <View key={tip.title} className="flex-row gap-4">
            <View className="size-[36px] items-center justify-center rounded-[4px] bg-primary-50">
              <MaterialCommunityIcons name="tape-measure" size={20} color={appColors.primary} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-[14px] leading-[22px] font-bold text-neutral-700">{tip.title}</Text>
              <Text className="text-[12px] leading-[20px] text-neutral-500">{tip.desc}</Text>
            </View>
          </View>
        ))}
      </View>}
    </Screen>
  )
}
