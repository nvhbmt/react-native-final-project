import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { useState } from 'react'
import { ActivityIndicator } from 'react-native'

import { useAuthStore, useCurrentUser, useRequireAuth } from '@/features/auth'
import { AuthScreenFrame } from '@/features/auth/components/AuthScreenFrame'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { FormBanner } from '@/features/auth/components/FormBanner'
import { SubmitButton } from '@/features/auth/components/SubmitButton'
import { useAuthForm } from '@/features/auth/lib/useAuthForm'
import { ApiError, pickImages, uploadImage } from '@/lib/api'
import { appColors } from '@/theme/tamagui.config'

import { accountApi } from '../api/accountApi'
import { ProfileAvatar } from '../components/ProfileAvatar'

type Field = 'fullName' | 'phone'
const PHONE = /^\+?[0-9 .-]{8,20}$/

export function EditProfileScreen() {
  useRequireAuth()
  const user = useCurrentUser()
  const setUser = useAuthStore((s) => s.setUser)
  const [values, setValues] = useState({ fullName: user?.fullName ?? '', phone: user?.phone ?? '' })
  const [saved, setSaved] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const form = useAuthForm<Field>(() => ({
    ...(values.fullName.trim() ? {} : { fullName: 'Vui lòng nhập họ tên' }),
    ...(!values.phone.trim() || PHONE.test(values.phone.trim()) ? {} : { phone: 'Số điện thoại không hợp lệ' }),
  }))

  const change = (field: Field) => (text: string) => {
    setValues((current) => ({ ...current, [field]: text }))
    form.clearError(field)
    setSaved(false)
  }

  const save = () =>
    form.submit(async () => {
      setUser(await accountApi.updateProfile({ fullName: values.fullName.trim(), phone: values.phone.trim() || null }))
      setSaved(true)
    })

  const changeAvatar = async () => {
    const [image] = await pickImages({ square: true })
    if (!image) return
    setAvatarBusy(true)
    setAvatarError(null)
    try {
      const upload = await uploadImage(image, 'avatar')
      setUser(await accountApi.setAvatar(upload.id))
    } catch (error) {
      setAvatarError(error instanceof ApiError ? error.message : 'Không đổi được ảnh đại diện')
    } finally {
      setAvatarBusy(false)
    }
  }

  return (
    <AuthScreenFrame header="Hồ sơ" title="Hồ sơ cá nhân" subtitle="Thông tin hiển thị trên đánh giá và dùng để liên hệ giao hàng.">
      <View className="items-center gap-2">
        <View onPress={avatarBusy ? undefined : changeAvatar} role="button" aria-label="Đổi ảnh đại diện" className="active:opacity-80">
          <ProfileAvatar user={user} size={88} />
          <View className="absolute right-0 bottom-0 size-[28px] items-center justify-center rounded-full border-2 border-white bg-primary">
            {avatarBusy ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="camera" size={14} color="#ffffff" />}
          </View>
        </View>
        {user?.avatarUrl ? (
          <Text
            role="button"
            onPress={async () => { if (!avatarBusy) setUser(await accountApi.setAvatar(null).catch(() => user)) }}
            className="text-[13px] leading-[20px] text-neutral-500"
          >
            Xoá ảnh đại diện
          </Text>
        ) : null}
        {avatarError ? <Text className="text-[12px] text-danger">{avatarError}</Text> : null}
      </View>

      <FormBanner message={form.formError} />
      {saved ? (
        <View role="status" className="flex-row items-center gap-2 rounded-[6px] bg-success-50 p-3">
          <Ionicons name="checkmark-circle" size={18} color={appColors.success} />
          <Text className="text-[14px] leading-[22px] text-success-700">Đã lưu thay đổi.</Text>
        </View>
      ) : null}
      <View className="gap-4">
        <AuthTextField label="Email" value={user?.email ?? ''} editable={false} />
        <AuthTextField label="Họ tên" value={values.fullName} onChangeText={change('fullName')} error={form.fieldErrors.fullName} autoComplete="name" />
        <AuthTextField
          label="Số điện thoại"
          value={values.phone}
          onChangeText={change('phone')}
          error={form.fieldErrors.phone}
          placeholder="0901 234 567"
          keyboardType="phone-pad"
          autoComplete="tel"
          returnKeyType="done"
          onSubmitEditing={save}
        />
      </View>
      <SubmitButton title="Lưu" loading={form.submitting} onPress={save} />
    </AuthScreenFrame>
  )
}
