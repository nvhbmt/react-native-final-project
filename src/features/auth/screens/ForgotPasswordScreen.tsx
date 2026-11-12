import { Text, View } from '@tamagui/tailwind'
import { useLocalSearchParams } from 'expo-router'
import { useRef, useState } from 'react'
import type { TextInputInstance } from 'react-native'

import { authApi } from '../api/authApi'
import { AuthScreenFrame } from '../components/AuthScreenFrame'
import { AuthSwitchLink } from '../components/AuthSwitchLink'
import { AuthTextField } from '../components/AuthTextField'
import { FormBanner } from '../components/FormBanner'
import { SubmitButton } from '../components/SubmitButton'
import { leaveAuthFlow } from '../lib/afterAuth'
import { EMAIL_PATTERN, MIN_PASSWORD, useAuthForm } from '../lib/useAuthForm'
import { useAuthStore } from '../store/authStore'

type Field = 'email' | 'code' | 'newPassword'

/** Hai bước: nhập email nhận mã → nhập mã 6 số + mật khẩu mới (đặt xong là đăng nhập luôn). */
export function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>()
  const resetPassword = useAuthStore((s) => s.resetPassword)
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [values, setValues] = useState({ email: params.email ?? '', code: '', newPassword: '' })
  const passwordRef = useRef<TextInputInstance>(null)

  const form = useAuthForm<Field>(() => ({
    ...(EMAIL_PATTERN.test(values.email.trim()) ? {} : { email: 'Email không hợp lệ' }),
    ...(step === 'reset' && !/^\d{6}$/.test(values.code.trim()) ? { code: 'Mã gồm 6 chữ số' } : {}),
    ...(step === 'reset' && values.newPassword.length < MIN_PASSWORD ? { newPassword: `Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự` } : {}),
  }))
  const change = (field: Field) => (text: string) => {
    setValues((v) => ({ ...v, [field]: text }))
    form.clearError(field)
  }

  const sendCode = () => form.submit(async () => {
    await authApi.forgotPassword(values.email.trim())
    setStep('reset')
  })
  const reset = () => form.submit(async () => {
    await resetPassword({ email: values.email.trim(), code: values.code.trim(), newPassword: values.newPassword })
    leaveAuthFlow()
  })

  return (
    <AuthScreenFrame
      brand
      header="Quên mật khẩu"
      title={step === 'email' ? 'Quên mật khẩu' : 'Nhập mã xác nhận'}
      subtitle={step === 'email'
        ? 'Nhập email đã đăng ký, chúng tôi sẽ gửi mã 6 số để đặt lại mật khẩu.'
        : `Nếu ${values.email.trim()} đã đăng ký, mã đã được gửi tới hộp thư. Mã có hiệu lực 15 phút.`}
    >
      <FormBanner message={form.formError} />
      {step === 'email' ? (
        <>
          <AuthTextField
            label="Email"
            value={values.email}
            onChangeText={change('email')}
            error={form.fieldErrors.email}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={sendCode}
          />
          <SubmitButton title="Gửi mã" loading={form.submitting} onPress={sendCode} />
        </>
      ) : (
        <>
          <View className="gap-4">
            <AuthTextField
              label="Mã xác nhận"
              value={values.code}
              onChangeText={change('code')}
              error={form.fieldErrors.code}
              placeholder="123456"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <AuthTextField
              ref={passwordRef}
              label="Mật khẩu mới"
              password
              value={values.newPassword}
              onChangeText={change('newPassword')}
              error={form.fieldErrors.newPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={reset}
            />
          </View>
          <SubmitButton title="Đặt lại mật khẩu" loading={form.submitting} onPress={reset} />
          <Text role="button" onPress={() => { if (!form.submitting) void sendCode() }} className="text-center text-[14px] font-bold text-primary">
            Gửi lại mã
          </Text>
        </>
      )}
      <AuthSwitchLink prompt="Nhớ mật khẩu rồi?" action="Đăng nhập" href="/login" />
    </AuthScreenFrame>
  )
}
