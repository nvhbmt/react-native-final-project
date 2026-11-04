import { useEffect, useRef, useState, type ComponentRef } from 'react'
import { Image, ScrollView, StyleSheet, type ImageSourcePropType } from 'react-native'
import { XStack, YStack } from 'tamagui'

import { marketplace as m } from '@/theme/marketplace'

import { keyboardAction } from './keyboardAction'

type Slide = { image: ImageSourcePropType; label: string }

export function BannerCarousel({ slides }: { slides: Slide[] }) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (width) scroll.current?.scrollTo({ x: active * width, animated: false })
  }, [width, active])

  return (
    <YStack gap={8} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView
        ref={scroll}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          if (width) setActive(Math.max(0, Math.min(slides.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))))
        }}
        style={styles.carousel}
      >
        {width > 0 && slides.map((slide, index) => (
          <Image key={index} source={slide.image} accessibilityLabel={slide.label} resizeMode="cover" style={{ width, height: 129 }} />
        ))}
      </ScrollView>
      <XStack justify="center" gap={7} h={8} items="center" aria-label={`Banner ${active + 1} of ${slides.length}`}>
        {slides.map((_, index) => (
          <YStack {...keyboardAction} key={index} role="button" aria-label={`Show banner ${index + 1}: ${slides[index].label}`} aria-pressed={index === active} onPress={() => setActive(index)} hitSlop={6} w={index === active ? 16 : 6} h={6} rounded={4} bg={index === active ? m.primary : m.starEmpty} />
        ))}
      </XStack>
    </YStack>
  )
}

const styles = StyleSheet.create({ carousel: { height: 129, borderRadius: 6, overflow: 'hidden' } })
