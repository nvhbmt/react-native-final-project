import { useState } from 'react'
import { Image, ScrollView, StyleSheet, type ImageSourcePropType } from 'react-native'
import { XStack, YStack } from 'tamagui'

import { marketplace as m } from '@/theme/marketplace'

type Slide = { image: ImageSourcePropType; label: string }

export function BannerCarousel({ slides }: { slides: Slide[] }) {
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState(0)

  return (
    <YStack gap={8} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          if (width) setActive(Math.round(event.nativeEvent.contentOffset.x / width))
        }}
        style={styles.carousel}
      >
        {width > 0 && slides.map((slide, index) => (
          <Image key={index} source={slide.image} accessibilityLabel={slide.label} resizeMode="cover" style={{ width, height: 129 }} />
        ))}
      </ScrollView>
      <XStack justify="center" gap={7} h={8} items="center" aria-label={`Banner ${active + 1} of ${slides.length}`}>
        {slides.map((_, index) => (
          <YStack key={index} w={index === active ? 16 : 6} h={6} rounded={4} bg={index === active ? m.primary : m.starEmpty} />
        ))}
      </XStack>
    </YStack>
  )
}

const styles = StyleSheet.create({ carousel: { height: 129, borderRadius: 6, overflow: 'hidden' } })
