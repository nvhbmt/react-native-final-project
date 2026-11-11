import { View } from '@tamagui/tailwind'
import { useRef, useState } from 'react'
import type { TextInputInstance } from 'react-native'

import { AuthScreenFrame } from '../components/AuthScreenFrame'
import { AuthSwitchLink } from '../components/AuthSwitchLink'
import { AuthTextField } from '../components/AuthTextField'
import { FormBanner } from '../components/FormBanner'
import { SubmitButton } from '../components/SubmitButton'
import { leaveAuthFlow } from '../lib/afterAuth'
import { EMAIL_PATTERN, MIN_PASSWORD, useAuthForm } from '../lib/useAuthForm'
import { useAuthStore } from '../store/authStore'

type Field = 'fullName' | 'email' | 'password' | 'confirm'

export function RegisterScreen() {
  const register = useAuthStore((s) => s.register)
  const [values, setValues] = useState<Record<Field, string>>({ fullName: '', email: '', password: '', confirm: '' })
  const emailRef = useRef<TextInputInstance>(null)
  const passwordRef = useRef<TextInputInstance>(null)
  const confirmRef = useRef<TextInputInstance>(null)

  const form = useAuthForm<Field>(() => ({
    ...(values.fullName.trim() ? {} : { fullName: 'Vui lòng nhập họ tên' }),
    ...(EMAIL_PATTERN.test(values.email.trim()) ? {} : { email: 'Email không hợp lệ' }),
    ...(values.password.length >= MIN_PASSWORD ? {} : { password: `Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự` }),
    ...(values.confirm === values.password ? {} : { confirm: 'Mật khẩu nhập lại không khớp' }),
  }))

  const change = (field: Field) => (text: string) => {
    setValues((current) => ({ ...current, [field]: text }))
    form.clearError(field)
  }

  const onSubmit = () =>
    form.submit(async () => {
      await register({ fullName: values.fullName.trim(), email: values.email.trim(), password: values.password })
      leaveAuthFlow()
    })

  return (
    <AuthScreenFrame brand header="Đăng ký" title="Tạo tài khoản" subtitle="Tạo tài khoản để lưu đơn hàng và sản phẩm yêu thích.">
      <FormBanner message={form.formError} />
      <View className="gap-4">
        <AuthTextField
          label="Họ và tên"
          value={values.fullName}
          onChangeText={change('fullName')}
          error={form.fieldErrors.fullName}
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <AuthTextField
          ref={emailRef}
          label="Email"
          value={values.email}
          onChangeText={change('email')}
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
          value={values.password}
          onChangeText={change('password')}
          error={form.fieldErrors.password}
          placeholder={`Tối thiểu ${MIN_PASSWORD} ký tự`}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <AuthTextField
          ref={confirmRef}
          label="Nhập lại mật khẩu"
          password
          value={values.confirm}
          onChangeText={change('confirm')}
          error={form.fieldErrors.confirm}
          placeholder="Nhập lại mật khẩu"
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
      </View>
      <SubmitButton title="Đăng ký" loading={form.submitting} onPress={onSubmit} />
      <AuthSwitchLink prompt="Đã có tài khoản?" action="Đăng nhập" href="/login" />
    </AuthScreenFrame>
  )
}
