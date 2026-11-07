import { DefaultTheme, ThemeProvider } from 'expo-router'
import { useEffect, type PropsWithChildren } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { TamaguiProvider } from 'tamagui'

import { useAuthStore } from '@/features/auth'
import { appColors, config } from '@/theme/tamagui.config'

// Đồng bộ màu header/nền của React Navigation với theme Tamagui.
const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: appColors.primary, background: '#ffffff', card: '#ffffff' },
}

// Gom mọi provider toàn cục (theme, safe area, auth; sau này: query client, i18n...).
// App cố định giao diện sáng (nền trắng); muốn hỗ trợ dark mode thì chọn theme theo useColorScheme().
export function AppProviders({ children }: PropsWithChildren) {
  // Khôi phục phiên đăng nhập từ refresh token đã lưu. Không chặn giao diện: khách vẫn duyệt
  // sản phẩm trong lúc chờ, chỉ màn cần tài khoản mới hiện trạng thái đang tải.
  useEffect(() => {
    void useAuthStore.getState().bootstrap()
  }, [])

  return (
    <SafeAreaProvider>
      <TamaguiProvider config={config} defaultTheme="light">
        <ThemeProvider value={navTheme}>
          {children}
        </ThemeProvider>
      </TamaguiProvider>
    </SafeAreaProvider>
  )
}
