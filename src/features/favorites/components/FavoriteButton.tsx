import { Ionicons } from '@expo/vector-icons'
import { View } from '@tamagui/tailwind'

import type { Product } from '@/features/products/types'
import { appColors } from '@/theme/tamagui.config'

import { useFavoritesStore, useIsFavorite } from '../store/favoritesStore'

type Props = { product: Pick<Product, 'id'> & Partial<Product>; size?: number }

/** Nút tim: chạm để thêm/bỏ yêu thích. */
export function FavoriteButton({ product, size = 22 }: Props) {
  const liked = useIsFavorite(product.id)
  const toggle = useFavoritesStore((s) => s.toggle)
  return (
    <View
      onPress={() => void toggle(product)}
      role="button"
      aria-pressed={liked}
      aria-label={liked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
      hitSlop={8}
      className="active:opacity-60"
    >
      <Ionicons name={liked ? 'heart' : 'heart-outline'} size={size} color={liked ? appColors.danger : appColors['neutral-500']} />
    </View>
  )
}
