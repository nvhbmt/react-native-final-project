import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'
import { useState } from 'react'

import { useAuthStore, useRequireAuth } from '@/features/auth'
import { AuthScreenFrame } from '@/features/auth/components/AuthScreenFrame'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { FormBanner } from '@/features/auth/components/FormBanner'
import { SubmitButton } from '@/features/auth/components/SubmitButton'
import { useAuthForm } from '@/features/auth/lib/useAuthForm'

import { accountApi } from '../api/accountApi'
import { confirmAction } from '../lib/confirm'

export function DeleteAccountScreen() {
  useRequireAuth()
  const clearLocalSession = useAuthStore((s) => s.clearLocalSession)
  const [password, setPassword] = useState('')
  const form = useAuthForm<'password'>(() => (password ? {} : { password: 'Nhập mật khẩu để xác nhận' }))

  const remove = () => form.submit(async () => {
    await accountApi.deleteAccount(password)
    await clearLocalSession()
    router.dismissTo('/')
  })

  return (
    <AuthScreenFrame header="Xoá tài khoản" title="Xoá tài khoản" subtitle="Thao tác này không thể hoàn tác.">
      <View className="gap-2 rounded-[6px] bg-[#fdf2f2] p-4">
        <Text className="text-[14px] leading-[22px] text-danger">Sẽ bị xoá vĩnh viễn: hồ sơ, giỏ hàng, sản phẩm yêu thích, lịch sử đơn hàng, đánh giá, góp ý, hộp thư và các cuộc trò chuyện với trợ lý.</Text>
      </View>
      <FormBanner message={form.formError} />
      <AuthTextField
        label="Mật khẩu"
        password
        value={password}
        onChangeText={(text) => { setPassword(text); form.clearError('password') }}
        error={form.fieldErrors.password}
        autoCapitalize="none"
        autoComplete="current-password"
      />
      <SubmitButton
        title="Xoá vĩnh viễn"
        loading={form.submitting}
        onPress={() => confirmAction('Xoá tài khoản?', 'Mọi dữ liệu sẽ bị xoá vĩnh viễn.', 'Xoá', remove)}
      />
    </AuthScreenFrame>
  )
}
