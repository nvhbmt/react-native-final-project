import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import type { TextInputInstance } from 'react-native'

import { AuthScreenFrame } from '../components/AuthScreenFrame'
import { AuthSwitchLink } from '../components/AuthSwitchLink'
import { AuthTextField } from '../components/AuthTextField'
import { FormBanner } from '../components/FormBanner'
import { SubmitButton } from '../components/SubmitButton'
import { leaveAuthFlow } from '../lib/afterAuth'
import { EMAIL_PATTERN, useAuthForm } from '../lib/useAuthForm'
import { useAuthStore } from '../store/authStore'

export function LoginScreen() {
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const passwordRef = useRef<TextInputInstance>(null)

  const form = useAuthForm<'email' | 'password'>(() => ({
    ...(EMAIL_PATTERN.test(email.trim()) ? {} : { email: 'Email không hợp lệ' }),
    ...(password ? {} : { password: 'Vui lòng nhập mật khẩu' }),
  }))

  const onSubmit = () =>
    form.submit(async () => {
      await login({ email: email.trim(), password })
      leaveAuthFlow()
    })

  return (
    <AuthScreenFrame brand header="Đăng nhập" title="Chào mừng trở lại" subtitle="Đăng nhập để đồng bộ giỏ hàng, đơn hàng và trò chuyện với trợ lý.">
      <FormBanner message={form.formError} />
      <View className="gap-4">
        <AuthTextField
          label="Email"
          value={email}
          onChangeText={(t) => {
            setEmail(t)
            form.clearError('email')
          }}
          error={form.fieldErrors.email}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <AuthTextField
          ref={passwordRef}
          label="Mật khẩu"
          password
          value={password}
          onChangeText={(t) => {
            setPassword(t)
            form.clearError('password')
          }}
          error={form.fieldErrors.password}
          placeholder="••••••••"
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
      </View>
      <Text
        role="link"
        onPress={() => router.replace({ pathname: '/forgot-password', params: { email: email.trim() } })}
        className="self-end text-[14px] leading-[22px] font-bold text-primary"
      >
        Quên mật khẩu?
      </Text>
      <SubmitButton title="Đăng nhập" loading={form.submitting} onPress={onSubmit} />
      <AuthSwitchLink prompt="Chưa có tài khoản?" action="Đăng ký" href="/register" />
    </AuthScreenFrame>
  )
}
