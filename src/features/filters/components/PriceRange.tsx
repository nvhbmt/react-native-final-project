import { StyleSheet, TextInput } from 'react-native'
import { Slider, XStack, YStack } from 'tamagui'

import { MarketText } from '@/components/marketplace/MarketText'
import type { ProductFilters } from '@/features/products/types'
import { marketplace as m } from '@/theme/marketplace'

import { cleanPrice, MAX_PRICE, normalizePriceRange } from '../lib/priceRange'

type Props = { value: ProductFilters; onChange: (filters: ProductFilters) => void }
// A power scale leaves enough drag space for both inexpensive and high-value goods.
const toPosition = (price: number) => Math.pow(Math.max(0, Math.min(MAX_PRICE, price)) / MAX_PRICE, 0.4) * 100
const toPrice = (position: number) => Math.round(MAX_PRICE * Math.pow(position / 100, 2.5) * 100) / 100

export function PriceRange({ value, onChange }: Props) {
  const minimum = Math.max(0, Number(value.minimumPrice) || 0)
  const maximum = value.maximumPrice === '' ? MAX_PRICE : Math.max(minimum, Number(value.maximumPrice) || 0)

  function normalize() {
    const range = normalizePriceRange(value.minimumPrice, value.maximumPrice)
    if (range.minimumPrice !== value.minimumPrice || range.maximumPrice !== value.maximumPrice) onChange({ ...value, ...range })
  }

  return (
    <YStack mt={17}>
      <XStack justify="space-between">
        {(['minimumPrice', 'maximumPrice'] as const).map((key) => (
          <XStack key={key} w={96} h={32} borderWidth={1} borderColor="#bcc1ca" rounded={3} px={10} items="center" gap={7}>
            <MarketText color={m.secondary} fontSize={16}>$</MarketText>
            <TextInput
              accessibilityLabel={key === 'minimumPrice' ? 'Minimum price' : 'Maximum price'}
              keyboardType="decimal-pad" value={value[key]} placeholder={key === 'minimumPrice' ? '0' : 'Any'}
              selectTextOnFocus returnKeyType="done"
              placeholderTextColor={m.secondary} onChangeText={(text) => onChange({ ...value, [key]: cleanPrice(text) })}
              onBlur={normalize} onEndEditing={normalize} underlineColorAndroid="transparent" style={styles.input}
            />
          </XStack>
        ))}
      </XStack>
      <Slider min={0} max={100} step={1} value={[toPosition(minimum), toPosition(maximum)]} onValueChange={([low, high]) => onChange({ ...value, minimumPrice: String(toPrice(low)), maximumPrice: String(toPrice(high)) })} h={36} mt={9} aria-label="Price range">
        <Slider.Track h={6} bg="#a5f3fc" rounded={4}>
          <Slider.TrackActive bg={m.primary} />
        </Slider.Track>
        <Slider.Thumb index={0} w={22} h={22} rounded={12} bg="white" borderWidth={1} borderColor={m.primary} aria-label="Minimum price slider" aria-valuetext={`$${minimum}`} />
        <Slider.Thumb index={1} w={22} h={22} rounded={12} bg="white" borderWidth={1} borderColor={m.primary} aria-label="Maximum price slider" aria-valuetext={`$${maximum}`} />
      </Slider>
    </YStack>
  )
}

const styles = StyleSheet.create({ input: { flex: 1, minWidth: 0, height: 30, padding: 0, fontFamily: m.bodyFont, fontSize: 12, color: m.secondary } })
