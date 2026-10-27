import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, TextInput } from 'react-native'
import { XStack, YStack } from 'tamagui'

import { marketplace as m } from '@/theme/marketplace'

type Props = {
  value: string
  onChangeText: (text: string) => void
  onFilter: () => void
  onSubmit?: () => void
  placeholder?: string
  filtered?: boolean
}

export function SearchField({ value, onChangeText, onFilter, onSubmit, placeholder = 'Search', filtered }: Props) {
  return (
    <XStack gap={14} h={36}>
      <XStack flex={1} items="center" bg={m.input} rounded={4} px={12} gap={6}>
        <Ionicons name="search-outline" size={15} color={m.ink} />
        <TextInput
          accessibilityLabel="Search products"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor="#bdc1ca"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          underlineColorAndroid="transparent"
          style={styles.input}
        />
      </XStack>
      <YStack
        role="button" aria-label="Filter products" onPress={onFilter}
        w={36} h={36} items="center" justify="center"
        rounded={4} bg={filtered ? '#e6fbfe' : m.input}
        hitSlop={4} opacity="1 press:0.65"
      >
        <Ionicons name="filter-outline" size={16} color={filtered ? m.primary : m.secondary} />
      </YStack>
    </XStack>
  )
}

const styles = StyleSheet.create({
  input: { flex: 1, minWidth: 0, height: 36, padding: 0, fontFamily: m.bodyFont, fontSize: 14, color: m.ink },
})
