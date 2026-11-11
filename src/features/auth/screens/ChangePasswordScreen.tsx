import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import type { TextInputInstance } from 'react-native'

import { useRequireAuth } from '../hooks'
import { AuthScreenFrame } from '../components/AuthScreenFrame'
import { AuthTextField } from '../components/AuthTextField'
import { FormBanner } from '../components/FormBanner'
import { SubmitButton } from '../components/SubmitButton'
import { MIN_PASSWORD, useAuthForm } from '../lib/useAuthForm'
import { useAuthStore } from '../store/authStore'

type Field = 'currentPassword' | 'newPassword' | 'confirm'

export function ChangePasswordScreen() {
  useRequireAuth()
  const changePassword = useAuthStore((s) => s.changePassword)
  const [values, setValues] = useState<Record<Field, string>>({ currentPassword: '', newPassword: '', confirm: '' })
  const [done, setDone] = useState(false)
  const newRef = useRef<TextInputInstance>(null)
  const confirmRef = useRef<TextInputInstance>(null)

  const form = useAuthForm<Field>(() => ({
    ...(values.currentPassword ? {} : { currentPassword: 'Vui lòng nhập mật khẩu hiện tại' }),
    ...(values.newPassword.length >= MIN_PASSWORD ? {} : { newPassword: `Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự` }),
    ...(values.confirm === values.newPassword ? {} : { confirm: 'Mật khẩu nhập lại không khớp' }),
  }))

  const change = (field: Field) => (text: string) => {
    setValues((current) => ({ ...current, [field]: text }))
    form.clearError(field)
    setDone(false)
  }

  const onSubmit = () =>
    form.submit(async () => {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      setValues({ currentPassword: '', newPassword: '', confirm: '' })
      setDone(true)
    })

  return (
    <AuthScreenFrame header="Đổi mật khẩu" title="Đổi mật khẩu" subtitle="Sau khi đổi, các thiết bị khác sẽ bị đăng xuất.">
      <FormBanner message={form.formError} />
      {done ? (
        <View role="status" className="rounded-[6px] bg-success-50 p-3">
          <Text className="text-[14px] leading-[22px] text-success-700">Đã đổi mật khẩu thành công.</Text>
        </View>
      ) : null}
      <View className="gap-4">
        <AuthTextField
          label="Mật khẩu hiện tại"
          password
          value={values.currentPassword}
          onChangeText={change('currentPassword')}
          error={form.fieldErrors.currentPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="next"
          onSubmitEditing={() => newRef.current?.focus()}
        />
        <AuthTextField
          ref={newRef}
          label="Mật khẩu mới"
          password
          value={values.newPassword}
          onChangeText={change('newPassword')}
          error={form.fieldErrors.newPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <AuthTextField
          ref={confirmRef}
          label="Nhập lại mật khẩu mới"
          password
          value={values.confirm}
          onChangeText={change('confirm')}
          error={form.fieldErrors.confirm}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
      </View>
      <SubmitButton title="Cập nhật mật khẩu" loading={form.submitting} onPress={onSubmit} />
      {done ? (
        <View onPress={() => router.back()} role="button" className="items-center active:opacity-60">
          <Text className="text-[14px] leading-[22px] font-bold text-primary">Quay lại tài khoản</Text>
        </View>
      ) : null}
    </AuthScreenFrame>
  )
}
