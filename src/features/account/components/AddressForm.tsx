import { View } from '@tamagui/tailwind'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { FormBanner } from '@/features/auth/components/FormBanner'
import { SubmitButton } from '@/features/auth/components/SubmitButton'
import { useAuthForm } from '@/features/auth/lib/useAuthForm'

import type { AddressInput } from '../api/accountApi'

type Field = keyof Omit<AddressInput, 'isDefault'>
const PHONE = /^\+?[0-9 .-]{8,20}$/

type Props = { initial?: AddressInput; onSubmit: (input: AddressInput) => Promise<void>; onCancel: () => void }

export function AddressForm({ initial, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<AddressInput>(initial ?? { recipientName: '', phone: '', line1: '', city: '' })
  const form = useAuthForm<Field>(() => ({
    ...(values.recipientName.trim() ? {} : { recipientName: 'Vui lòng nhập tên người nhận' }),
    ...(PHONE.test(values.phone.trim()) ? {} : { phone: 'Số điện thoại không hợp lệ' }),
    ...(values.line1.trim() ? {} : { line1: 'Vui lòng nhập địa chỉ' }),
    ...(values.city.trim() ? {} : { city: 'Vui lòng nhập tỉnh/thành phố' }),
  }))
  const field = (name: Field, label: string, extra: object = {}) => (
    <AuthTextField
      label={label}
      value={values[name]}
      onChangeText={(text) => {
        setValues((v) => ({ ...v, [name]: text }))
        form.clearError(name)
      }}
      error={form.fieldErrors[name]}
      {...extra}
    />
  )

  return (
    <View className="gap-4 rounded-[8px] border border-neutral-300 p-4">
      <FormBanner message={form.formError} />
      {field('recipientName', 'Người nhận', { autoComplete: 'name' })}
      {field('phone', 'Số điện thoại', { keyboardType: 'phone-pad', autoComplete: 'tel' })}
      {field('line1', 'Địa chỉ', { placeholder: 'Số nhà, đường, phường/xã, quận/huyện', autoComplete: 'street-address' })}
      {field('city', 'Tỉnh / thành phố')}
      <SubmitButton title="Lưu địa chỉ" loading={form.submitting} onPress={() => form.submit(() => onSubmit({
        ...values, recipientName: values.recipientName.trim(), phone: values.phone.trim(), line1: values.line1.trim(), city: values.city.trim(),
      }))} />
      <Button title="Huỷ" variant="text" onPress={onCancel} />
    </View>
  )
}
