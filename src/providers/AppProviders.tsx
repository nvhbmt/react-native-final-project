import { DefaultTheme, ThemeProvider } from 'expo-router'
import type { PropsWithChildren } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { TamaguiProvider } from 'tamagui'

import { appColors, config } from '@/theme/tamagui.config'

// Đồng bộ màu header/nền của React Navigation với theme Tamagui.
const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: appColors.primary, background: '#ffffff', card: '#ffffff' },
}

// Gom mọi provider toàn cục (theme, safe area, sau này: query client, auth, i18n...).
// App cố định giao diện sáng (nền trắng); muốn hỗ trợ dark mode thì chọn theme theo useColorScheme().
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <TamaguiProvider config={config} defaultTheme="light">
        <ThemeProvider value={navTheme}>{children}</ThemeProvider>
      </TamaguiProvider>
    </SafeAreaProvider>
  )
}
