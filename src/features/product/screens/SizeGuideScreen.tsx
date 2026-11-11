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

// `key` khớp với `sizeChart.columns[].key` từ server; nhãn hiển thị Việt hoá tại đây.
const MEASURE_TIPS = [
  { key: 'chest', title: 'Vòng ngực', desc: 'Đo quanh phần nở nhất của ngực, giữ thước dây nằm ngang và vừa khít.' },
  { key: 'waist', title: 'Vòng eo', desc: 'Đo quanh phần nhỏ nhất của eo, ngay phía trên rốn.' },
  { key: 'length', title: 'Chiều dài', desc: 'Đo từ điểm cao nhất của vai xuống tới gấu áo.' },
]
const SHOE_LENGTH_TIP = { key: 'length', title: 'Chiều dài bàn chân', desc: 'Đứng thẳng trên tờ giấy, đo từ gót tới đầu ngón chân dài nhất.' }

const columnLabel = (column: { key: string; label: string }, shoes: boolean) =>
  column.key === 'length' && shoes ? 'Dài chân' : MEASURE_TIPS.find((tip) => tip.key === column.key)?.title ?? column.label

const toUnit = (cm: number, unit: Unit) => (unit === 'cm' ? String(cm) : (cm / 2.54).toFixed(1))

export function SizeGuideScreen() {
  const { product, ...request } = useRouteProduct()
  const { size } = useLocalSearchParams<{ size?: string }>()
  const [unit, setUnit] = useState<Unit>('cm')
  const [selected, setSelected] = useState(size)

  if (!product) return <ProductStatus title="Bảng size" {...request} />
  if (!product.sizeChart) return <Screen header={<AppHeader title="Bảng size" />}><CatalogStatus message="Sản phẩm này chưa có bảng size." /></Screen>
  const { columns, rows } = product.sizeChart
  const shoes = product.subcategory === 'shoes'
  const tips = MEASURE_TIPS
    .filter((tip) => columns.some((column) => column.key === tip.key))
    .map((tip) => (shoes && tip.key === 'length' ? SHOE_LENGTH_TIP : tip))

  return (
    <Screen header={<AppHeader title="Bảng size" />} contentClassName="gap-6 px-6 pt-2 pb-6" safeBottom>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 gap-1">
          <Text className="font-heading text-[18px] leading-[28px] font-bold text-neutral-700">{product.name}</Text>
          <Text className="text-[12px] leading-[20px] text-neutral-600">Số đo theo size</Text>
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
              {columnLabel(c, shoes)}
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
        <Text className="font-heading text-[18px] leading-[28px] font-bold text-neutral-700">Cách đo</Text>
        {tips.map((tip) => (
          <View key={tip.key} className="flex-row gap-4">
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
