import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator } from 'react-native'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Screen } from '@/components/ui/Screen'
import { useRequireAuth } from '@/features/auth'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { ApiError } from '@/lib/api'
import { appColors } from '@/theme/tamagui.config'

import { accountApi, type Address } from '../api/accountApi'
import { AddressForm } from '../components/AddressForm'
import { confirmAction } from '../lib/confirm'

function AddressCard({ address, busy, onEdit, onDefault, onRemove }: {
  address: Address; busy: boolean; onEdit: () => void; onDefault: () => void; onRemove: () => void
}) {
  return (
    <View className="gap-2 rounded-[8px] border p-4" style={{ borderColor: address.isDefault ? appColors.primary : appColors['neutral-300'] }}>
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 font-heading text-[15px] leading-[24px] font-bold text-neutral-900">{address.recipientName}</Text>
        {address.isDefault ? <Text className="rounded-full bg-primary px-2 text-[11px] leading-[20px] text-white">Mặc định</Text> : null}
      </View>
      <Text className="text-[14px] leading-[22px] text-neutral-700">{address.phone}</Text>
      <Text className="text-[14px] leading-[22px] text-neutral-600">{address.line1}, {address.city}</Text>
      <View className="flex-row items-center gap-5 pt-1">
        {busy ? <ActivityIndicator color={appColors.primary} /> : (
          <>
            <Text role="button" onPress={onEdit} className="text-[13px] font-bold text-primary">Sửa</Text>
            {!address.isDefault ? <Text role="button" onPress={onDefault} className="text-[13px] font-bold text-primary">Đặt mặc định</Text> : null}
            <Text role="button" onPress={onRemove} className="text-[13px] font-bold text-danger">Xoá</Text>
          </>
        )}
      </View>
    </View>
  )
}

export function AddressesScreen() {
  useRequireAuth()
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    accountApi.addresses().then(
      (list) => { setAddresses(list); setError(null) },
      (e: unknown) => setError(e instanceof ApiError ? e.message : 'Không tải được địa chỉ'),
    )
  }, [])
  useEffect(load, [load])

  const run = async (id: string, action: () => Promise<Address[]>) => {
    setBusyId(id)
    try {
      setAddresses(await action())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không thực hiện được, vui lòng thử lại')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Screen header={<AppHeader title="Địa chỉ giao hàng" />} contentClassName="gap-4 px-6 pt-4 pb-8" safeBottom>
      {error ? <Text role="alert" className="text-[13px] text-danger">{error}</Text> : null}
      {addresses === null ? (
        <CatalogStatus loading={!error} onRetry={error ? load : undefined} />
      ) : (
        <>
          {addresses.map((address) => editing === address.id ? (
            <AddressForm
              key={address.id}
              initial={address}
              onCancel={() => setEditing(null)}
              onSubmit={async (input) => { setAddresses(await accountApi.updateAddress(address.id, input)); setEditing(null) }}
            />
          ) : (
            <AddressCard
              key={address.id}
              address={address}
              busy={busyId === address.id}
              onEdit={() => setEditing(address.id)}
              onDefault={() => run(address.id, () => accountApi.updateAddress(address.id, { isDefault: true }))}
              onRemove={() => confirmAction('Xoá địa chỉ?', `${address.line1}, ${address.city}`, 'Xoá', () => run(address.id, () => accountApi.removeAddress(address.id)))}
            />
          ))}
          {!addresses.length && editing !== 'new' ? (
            <View className="items-center gap-2 py-10">
              <Ionicons name="location-outline" size={48} color={appColors.primary} />
              <Text className="text-[14px] text-neutral-600">Chưa có địa chỉ giao hàng.</Text>
            </View>
          ) : null}
          {editing === 'new' ? (
            <AddressForm onCancel={() => setEditing(null)} onSubmit={async (input) => { setAddresses(await accountApi.addAddress(input)); setEditing(null) }} />
          ) : addresses.length < 10 ? (
            <Button title="Thêm địa chỉ" leftIcon="add" variant="outline" onPress={() => setEditing('new')} />
          ) : null}
        </>
      )}
    </Screen>
  )
}
