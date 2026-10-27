import { router } from 'expo-router'
import { Image, ScrollView, StyleSheet } from 'react-native'
import { YStack } from 'tamagui'

import { MarketText } from '@/components/marketplace/MarketText'
import { categories } from '@/features/products'
import { marketplace as m } from '@/theme/marketplace'

export function CategoryStrip() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {categories.map((category) => (
        <YStack key={category.id} w={84} gap={8} items="center" role="button" aria-label={`Browse ${category.name}`} onPress={() => router.push({ pathname: '/product-listing', params: { category: category.id } })} opacity="1 press:0.8">
          <YStack w={84} h={84} rounded={42} bg={category.id === 'fruits' ? '#e85660' : 'transparent'} overflow="hidden">
            <Image source={category.image} style={category.id === 'fruits' ? styles.fruit : styles.image} resizeMode="contain" />
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
  fruit: { width: 80, height: 80, marginTop: 3, marginLeft: 2 },
})
