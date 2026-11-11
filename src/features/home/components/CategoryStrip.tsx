import { Image } from 'expo-image'
import { router } from 'expo-router'
import { ScrollView, StyleSheet } from 'react-native'
import { YStack } from 'tamagui'

import { MarketText } from '@/components/marketplace/MarketText'
import type { CatalogCategory } from '@/features/products/types'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import { marketplace as m } from '@/theme/marketplace'

export function CategoryStrip({ categories }: { categories: CatalogCategory[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {categories.map((category) => (
        <YStack {...keyboardAction} key={category.id} w={84} gap={8} items="center" role="button" aria-label={`Xem ${category.name}`} onPress={() => router.push({ pathname: '/product-listing', params: { category: category.id } })} opacity="1 press:0.8">
          <YStack w={84} h={84} rounded={42} bg={m.surface} overflow="hidden">
            {category.image && <Image source={category.image} style={styles.image} contentFit="contain" />}
          </YStack>
          <MarketText color={m.ink} fontSize={12} lineHeight="20px" fontWeight="600" numberOfLines={1}>{category.name}</MarketText>
        </YStack>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, gap: 18 },
  image: { width: 84, height: 84 },
})
