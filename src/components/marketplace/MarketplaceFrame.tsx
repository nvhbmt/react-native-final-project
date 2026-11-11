import type { PropsWithChildren } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { YStack } from 'tamagui'

import { MarketplaceHeader } from './MarketplaceHeader'

export function MarketplaceFrame({ title, onBack, children }: PropsWithChildren<{ title: string; onBack?: () => void }>) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <YStack flex={1} bg="white">
        <MarketplaceHeader title={title} onBack={onBack} />
        {children}
      </YStack>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: '#fff' } })
