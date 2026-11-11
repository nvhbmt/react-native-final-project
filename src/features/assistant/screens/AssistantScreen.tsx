import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Fragment, useCallback, useRef, useState } from 'react'

import { AppHeader } from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { Screen } from '@/components/ui/Screen'
import { confirmAction } from '@/features/account/lib/confirm'
import { useRequireAuth } from '@/features/auth'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { ApiError } from '@/lib/api'
import { appColors } from '@/theme/tamagui.config'

import { assistantApi, type Conversation } from '../api/assistantApi'

/**
 * Danh sách hội thoại với trợ lý. Mở kèm `productId`/`orderId` (từ trang sản phẩm / chi tiết đơn)
 * thì tạo hội thoại có ngữ cảnh và vào thẳng màn chat.
 */
export function AssistantScreen() {
  useRequireAuth()
  const params = useLocalSearchParams<{ productId?: string; orderId?: string }>()
  const [data, setData] = useState<{ items: Conversation[]; available: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const handledContext = useRef(false)

  const openChat = (conversation: Conversation) =>
    router.push({ pathname: '/assistant/[id]', params: { id: conversation.id, title: conversation.title } })

  const create = useCallback(async (context: { productId?: string; orderId?: string } = {}, replace = false) => {
    setCreating(true)
    try {
      const conversation = await assistantApi.create(context)
      const target = { pathname: '/assistant/[id]' as const, params: { id: conversation.id, title: conversation.title } }
      if (replace) router.replace(target)
      else router.push(target)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tạo được cuộc trò chuyện')
    } finally {
      setCreating(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    if ((params.productId || params.orderId) && !handledContext.current) {
      handledContext.current = true
      void create({ productId: params.productId, orderId: params.orderId }, true)
      return
    }
    assistantApi.list().then(setData, (e: unknown) => setError(e instanceof ApiError ? e.message : 'Không tải được hội thoại'))
  }, [create, params.orderId, params.productId]))

  const remove = (conversation: Conversation) => confirmAction('Xoá cuộc trò chuyện?', conversation.title, 'Xoá', async () => {
    await assistantApi.remove(conversation.id).catch(() => undefined)
    setData((d) => d && { ...d, items: d.items.filter((c) => c.id !== conversation.id) })
  })

  return (
    <Screen header={<AppHeader title="Trợ lý mua sắm" />} contentClassName="gap-4 px-5 pt-3 pb-8" safeBottom>
      {data && !data.available ? (
        <Text className="rounded-[6px] bg-[#fff6e5] p-3 text-[13px] leading-[20px] text-[#a15c00]">Trợ lý AI chưa được bật trên máy chủ (thiếu cấu hình AI_*).</Text>
      ) : null}
      <Button title={creating ? 'Đang tạo…' : 'Cuộc trò chuyện mới'} leftIcon="add" disabled={creating} onPress={() => void create()} />
      {error ? <Text role="alert" className="text-[13px] text-danger">{error}</Text> : null}
      {!data ? <CatalogStatus loading={!error} /> : data.items.length ? (
        <View className="overflow-hidden rounded-[8px] border border-neutral-200">
          {data.items.map((conversation, i) => (
            <Fragment key={conversation.id}>
              {i > 0 ? <Divider /> : null}
              <View onPress={() => openChat(conversation)} role="link" className="flex-row items-center gap-3 px-4 py-3 active:bg-neutral-100">
                <Ionicons name={conversation.orderId ? 'receipt-outline' : conversation.productId ? 'pricetag-outline' : 'chatbubbles-outline'} size={20} color={appColors.primary} />
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-[14px] leading-[22px] text-neutral-900">{conversation.title}</Text>
                  <Text className="text-[12px] text-neutral-500">{new Date(conversation.updatedAt).toLocaleString('vi-VN')}</Text>
                </View>
                <View onPress={() => remove(conversation)} role="button" aria-label="Xoá" hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={appColors['neutral-400']} />
                </View>
              </View>
            </Fragment>
          ))}
        </View>
      ) : (
        <Text className="py-8 text-center text-[14px] text-neutral-500">Chưa có cuộc trò chuyện nào.</Text>
      )}
    </Screen>
  )
}
