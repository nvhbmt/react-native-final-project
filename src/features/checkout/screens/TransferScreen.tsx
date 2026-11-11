import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator } from 'react-native'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Screen } from '@/components/ui/Screen'
import { confirmAction } from '@/features/account/lib/confirm'
import { useRequireAuth } from '@/features/auth'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { ApiError } from '@/lib/api'
import { formatVnd } from '@/lib/format'
import { appColors } from '@/theme/tamagui.config'

import { ordersApi } from '../api/ordersApi'
import { CopyRow } from '../components/CopyRow'
import { useOrder } from '../hooks/useOrder'

const POLL_MS = 4000

function useCountdown(until: number | null | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  if (!until) return null
  const left = Math.max(0, Math.floor((until - now) / 1000))
  return `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`
}

/** Màn chuyển khoản SePay: QR + thông tin tài khoản, tự kiểm tra tới khi nhận được tiền. */
export function TransferScreen() {
  useRequireAuth()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { order, error, retry, update } = useOrder(id, POLL_MS)
  const [busy, setBusy] = useState<'renew' | 'cancel' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const countdown = useCountdown(order?.payment?.expiresAt)

  // Đã nhận tiền (hoặc đơn đã huỷ) → chuyển sang màn kết quả.
  useEffect(() => {
    if (order && order.status !== 'pending_payment') router.replace({ pathname: '/checkout/success', params: { id: order.id } })
  }, [order])

  const act = (kind: 'renew' | 'cancel', run: () => Promise<void>) => async () => {
    setBusy(kind)
    setActionError(null)
    try {
      await run()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Không thực hiện được, vui lòng thử lại')
    } finally {
      setBusy(null)
    }
  }

  const payment = order?.payment
  if (!order || !payment) {
    return (
      <Screen header={<AppHeader title="Chuyển khoản" />}>
        <CatalogStatus loading={!error} message={error ?? undefined} onRetry={error ? retry : undefined} />
      </Screen>
    )
  }
  const expired = payment.expired || countdown === '00:00'

  return (
    <Screen header={<AppHeader title="Chuyển khoản" onBack={() => router.dismissTo('/')} />} contentClassName="gap-4 px-5 pt-3 pb-8" safeBottom>
      <View className="items-center gap-1">
        <Text className="text-[14px] leading-[22px] text-neutral-600">Đơn #{order.code}</Text>
        <Text className="font-heading text-[28px] leading-[40px] font-bold text-neutral-900">{formatVnd(payment.amountVnd)}</Text>
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color={appColors.primary} />
          <Text className="text-[13px] leading-[20px] text-neutral-600">
            {expired ? 'Mã đã hết hạn — bạn vẫn có thể gia hạn để thanh toán' : `Đang chờ thanh toán · còn ${countdown ?? '--:--'}`}
          </Text>
        </View>
      </View>

      {payment.simulated ? (
        <View role="alert" className="flex-row items-start gap-2 rounded-[6px] border border-danger bg-[#fdecec] p-3">
          <Ionicons name="warning" size={18} color={appColors.danger} />
          <Text className="flex-1 text-[13px] leading-[20px] text-danger">
            <Text className="font-bold text-danger">Chế độ giả lập — đừng chuyển tiền thật.</Text> Tài khoản bên dưới không có thật.
            Xác nhận thanh toán bằng lệnh <Text className="font-bold text-danger">npm run sepay:simulate</Text> trong thư mục server.
          </Text>
        </View>
      ) : null}

      <View className="items-center rounded-[8px] border border-neutral-200 bg-white p-3" style={{ opacity: expired ? 0.35 : 1 }}>
        <Image source={payment.qrUrl} style={{ width: 240, height: 240 }} contentFit="contain" accessibilityLabel="Mã VietQR thanh toán" />
      </View>
      <Text className="text-center text-[13px] leading-[20px] text-neutral-600">
        Mở app ngân hàng → Quét QR. Nếu chuyển tay, nhập <Text className="font-bold text-primary">đúng nội dung</Text> bên dưới.
      </Text>

      <View className="rounded-[8px] bg-neutral-100 px-4 py-2">
        <CopyRow label="Ngân hàng" value={payment.bank} />
        <CopyRow label="Số tài khoản" value={payment.accountNumber} />
        <CopyRow label="Chủ tài khoản" value={payment.accountName} />
        <CopyRow label="Số tiền" value={formatVnd(payment.amountVnd)} copyValue={String(payment.amountVnd)} />
        <CopyRow label="Nội dung chuyển khoản" value={payment.content} highlight />
      </View>

      <View className="flex-row items-start gap-2 rounded-[6px] bg-[#fff6e5] p-3">
        <Ionicons name="information-circle" size={18} color="#a15c00" />
        <Text className="flex-1 text-[12px] leading-[19px] text-[#a15c00]">
          Đơn được xác nhận tự động trong vài giây sau khi tiền vào tài khoản. Chuyển thiếu tiền hoặc sai nội dung sẽ không được xác nhận tự động.
        </Text>
      </View>

      {actionError ? <Text role="alert" className="text-[13px] text-danger">{actionError}</Text> : null}
      {expired ? (
        <Button title={busy === 'renew' ? 'Đang gia hạn…' : 'Gia hạn mã thanh toán'} disabled={!!busy} onPress={act('renew', async () => update(await ordersApi.pay(order.id)))} />
      ) : null}
      <Button title="Xem đơn hàng" variant="outline" onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })} />
      <Button
        title={busy === 'cancel' ? 'Đang huỷ…' : 'Huỷ đơn'}
        variant="text"
        disabled={!!busy}
        onPress={() => confirmAction('Huỷ đơn hàng?', 'Nếu bạn đã chuyển tiền, đừng huỷ — đơn sẽ tự xác nhận.', 'Huỷ đơn', act('cancel', async () => update(await ordersApi.cancel(order.id))))}
      />
    </Screen>
  )
}
