import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import { AppProviders } from '@/providers/AppProviders'
import { useAppFonts } from '@/theme/useAppFonts'

// Giữ splash cho tới khi font nạp xong, tránh nháy font hệ thống.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const fontsReady = useAppFonts()

  useEffect(() => {
    if (fontsReady) SplashScreen.hide()
  }, [fontsReady])

  if (!fontsReady) return null

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="checkout/index" />
        <Stack.Screen name="checkout/payment" />
        <Stack.Screen name="checkout/success" />
        <Stack.Screen
          name="feedback"
          options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
        />
        <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'Không tìm thấy' }} />
      </Stack>
    </AppProviders>
  )
}
