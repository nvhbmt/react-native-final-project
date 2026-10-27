import { DefaultTheme, ThemeProvider } from 'expo-router'
import { useFonts } from 'expo-font'
import type { PropsWithChildren } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { TamaguiProvider } from 'tamagui'

import { appColors, config } from '@/theme/tamagui.config'

import { CartProvider } from './CartProvider'

// Đồng bộ màu header/nền của React Navigation với theme Tamagui.
const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: appColors.primary, background: '#ffffff', card: '#ffffff' },
}

// Gom mọi provider toàn cục (theme, safe area, sau này: query client, auth, i18n...).
// App cố định giao diện sáng (nền trắng); muốn hỗ trợ dark mode thì chọn theme theo useColorScheme().
export function AppProviders({ children }: PropsWithChildren) {
  const [fontsLoaded, fontError] = useFonts({
    MarketplaceInter: require('../../assets/fonts/Inter.ttf'),
    MarketplaceManrope: require('../../assets/fonts/Manrope.ttf'),
  })

  if (!fontsLoaded && !fontError) return null

  return (
    <SafeAreaProvider>
      <TamaguiProvider config={config} defaultTheme="light">
        <ThemeProvider value={navTheme}>
          <CartProvider>{children}</CartProvider>
        </ThemeProvider>
      </TamaguiProvider>
    </SafeAreaProvider>
  )
}
