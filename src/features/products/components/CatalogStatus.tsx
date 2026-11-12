import { ActivityIndicator } from 'react-native'
import { YStack } from 'tamagui'

import { MarketText } from '@/components/marketplace/MarketText'
import { keyboardAction } from '@/components/marketplace/keyboardAction'
import { marketplace as m } from '@/theme/marketplace'

export function CatalogStatus({ message, loading, onRetry }: { message?: string; loading?: boolean; onRetry?: () => void }) {
  return (
    <YStack items="center" justify="center" gap={10} py={32} px={24} aria-live="polite">
      {loading && <ActivityIndicator color={m.primary} accessibilityLabel="Đang tải" />}
      {message && <MarketText text="center" color={m.secondary}>{message}</MarketText>}
      {onRetry && <MarketText {...keyboardAction} role="button" onPress={onRetry} color={m.primary} hitSlop={8}>Thử lại</MarketText>}
    </YStack>
  )
}
