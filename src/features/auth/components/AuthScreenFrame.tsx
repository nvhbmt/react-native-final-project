import { Text, View } from '@tamagui/tailwind'
import type { PropsWithChildren } from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'

import { AppHeader } from '@/components/ui/AppHeader'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { Screen } from '@/components/ui/Screen'

/** `brand`: hiện logo MobiMart phía trên tiêu đề (đăng nhập, đăng ký, quên mật khẩu). */
type Props = PropsWithChildren<{ header: string; title: string; subtitle: string; brand?: boolean }>

export function AuthScreenFrame({ header, title, subtitle, brand = false, children }: Props) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<AppHeader title={header} />} safeBottom contentClassName="gap-5 px-6 pt-4 pb-8">
        {brand ? <BrandLogo /> : null}
        <View className="gap-1">
          <Text className="font-heading text-[26px] leading-[36px] font-bold text-neutral-900">{title}</Text>
          <Text className="text-[14px] leading-[22px] text-neutral-600">{subtitle}</Text>
        </View>
        {children}
      </Screen>
    </KeyboardAvoidingView>
  )
}
