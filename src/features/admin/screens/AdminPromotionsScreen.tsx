import { Text, View } from '@tamagui/tailwind'
import { useState } from 'react'

import { AppHeader } from '@/components/ui/AppHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Screen } from '@/components/ui/Screen'
import { confirmAction } from '@/features/account/lib/confirm'
import { useCurrentUser, useRequireAuth } from '@/features/auth'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { SubmitButton } from '@/features/auth/components/SubmitButton'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { useCatalogRequest } from '@/features/products/hooks/useCatalogRequest'
import { ApiError } from '@/lib/api'

import { adminApi } from '../api/adminApi'

/** Soạn và gửi tin khuyến mãi vào Hộp thư của khách đã bật "Nhận thông báo khuyến mãi" (chỉ admin). */
export function AdminPromotionsScreen() {
  useRequireAuth()
  const user = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const [version, setVersion] = useState(0)
  const audience = useCatalogRequest<{ recipients: number }>(isAdmin ? '/admin/promotions/audience' : undefined, { auth: true, version: String(version) })
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [productId, setProductId] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  if (!user) return <Screen header={<AppHeader title="Gửi khuyến mãi" />}><CatalogStatus loading /></Screen>
  if (!isAdmin) {
    return (
      <Screen header={<AppHeader title="Gửi khuyến mãi" />}>
        <EmptyState icon="lock-closed-outline" title="Không có quyền truy cập" description="Trang này chỉ dành cho tài khoản quản trị của cửa hàng." />
      </Screen>
    )
  }

  const recipients = audience.data?.recipients ?? 0
  const send = () => confirmAction('Gửi khuyến mãi?', `Tin sẽ vào Hộp thư của ${recipients} khách đã bật nhận khuyến mãi.`, 'Gửi', async () => {
    setSending(true)
    setMessage(null)
    try {
      const result = await adminApi.sendPromotion({ title: title.trim(), body: body.trim(), productId: productId.trim() || undefined })
      setMessage({ ok: true, text: `Đã gửi tới ${result.sent} khách.` })
      setTitle('')
      setBody('')
      setProductId('')
      setVersion((v) => v + 1)
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? e.message : 'Không gửi được, vui lòng thử lại' })
    } finally {
      setSending(false)
    }
  })

  return (
    <Screen header={<AppHeader title="Gửi khuyến mãi" />} contentClassName="gap-4 px-6 pt-3 pb-8" safeBottom>
      <Text className="text-[14px] leading-[22px] text-neutral-600">
        {audience.loading ? 'Đang đếm người nhận…' : `${recipients} khách đang bật "Nhận thông báo khuyến mãi".`}
      </Text>
      <AuthTextField label="Tiêu đề" value={title} onChangeText={setTitle} maxLength={100} placeholder="Giảm 20% cuối tuần" />
      <AuthTextField label="Nội dung" value={body} onChangeText={setBody} maxLength={500} placeholder="Áp dụng cho trái cây tươi tới hết Chủ nhật." />
      <AuthTextField label="Mã sản phẩm (tuỳ chọn)" value={productId} onChangeText={setProductId} autoCapitalize="none" placeholder="pear" />
      {message ? (
        <View role="alert">
          <Text className={message.ok ? 'text-[13px] text-success-700' : 'text-[13px] text-danger'}>{message.text}</Text>
        </View>
      ) : null}
      <SubmitButton title="Gửi khuyến mãi" loading={sending} onPress={() => { if (title.trim() && body.trim() && recipients > 0) send() }} />
    </Screen>
  )
}
