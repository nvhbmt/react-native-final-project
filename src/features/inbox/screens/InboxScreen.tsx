import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router, useFocusEffect } from 'expo-router'
import { Fragment, useCallback } from 'react'

import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { EmptyState } from '@/components/ui/EmptyState'
import { Screen } from '@/components/ui/Screen'
import { useAuthStatus, useAuthStore, useCurrentUser } from '@/features/auth'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { useProductPages } from '@/features/products/hooks/useProductPages'
import { appColors } from '@/theme/tamagui.config'

import { InboxItem } from '../components/InboxItem'
import { useInboxStore, type InboxMessage, type InboxPage } from '../store/inboxStore'

export function InboxScreen() {
  const auth = useAuthStatus()
  const user = useCurrentUser()
  const { revision, unreadCount, markRead, markAllRead } = useInboxStore()
  const page = useProductPages<InboxPage>(user ? '/inbox?limit=20' : undefined, `${user?.id}:${revision}`, true)
  // Mỗi lần mở tab: lấy tin mới.
  useFocusEffect(useCallback(() => {
    if (!useAuthStore.getState().user) return
    useInboxStore.setState((s) => ({ revision: s.revision + 1 }))
    void useInboxStore.getState().refreshUnread()
  }, []))

  const open = (message: InboxMessage) => {
    if (!message.read) void markRead(message.id).catch(() => undefined)
    if (message.data.orderId) router.push({ pathname: '/orders/[id]', params: { id: message.data.orderId } })
    else if (message.data.productId) router.push({ pathname: '/product/[id]', params: { id: message.data.productId } })
  }

  return (
    <Screen title="Hộp thư" contentClassName="gap-3 pt-2 pb-6">
      {auth === 'guest' ? (
        <EmptyState icon="mail-outline" title="Nhận thông báo đơn hàng" description="Đăng nhập để nhận thông báo về đơn hàng và thanh toán.">
          <Button title="Đăng nhập" onPress={() => router.push('/login')} />
        </EmptyState>
      ) : (
        <>
          <View
            onPress={() => router.push('/assistant')}
            role="link"
            className="mx-6 flex-row items-center gap-3 rounded-[8px] bg-[#f3f0ff] p-4 active:opacity-80"
          >
            <Ionicons name="sparkles" size={22} color={appColors.primary} />
            <View className="flex-1">
              <Text className="text-[15px] leading-[24px] font-bold text-neutral-900">Trợ lý mua sắm AI</Text>
              <Text className="text-[13px] leading-[20px] text-neutral-600">Hỏi về sản phẩm, so sánh, theo dõi đơn hàng</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={appColors['neutral-400']} />
          </View>
          {unreadCount > 0 ? (
            <Text role="button" onPress={() => void markAllRead().catch(() => undefined)} className="self-end px-6 text-[13px] font-bold text-primary">
              Đánh dấu tất cả đã đọc
            </Text>
          ) : null}
          {page.loading || page.error || auth === 'unknown' ? (
            <CatalogStatus loading={page.loading || auth === 'unknown'} message={page.error ? 'Không tải được hộp thư.' : undefined} onRetry={page.error ? page.retry : undefined} />
          ) : page.items.length ? (
            <View>
              {page.items.map((message, i) => (
                <Fragment key={message.id}>
                  {i > 0 ? <Divider className="bg-neutral-200" /> : null}
                  <InboxItem message={message} onPress={() => open(message)} />
                </Fragment>
              ))}
            </View>
          ) : (
            <EmptyState icon="mail-open-outline" title="Chưa có thông báo nào" description="Thông báo về đơn hàng, thanh toán và góp ý sẽ hiện ở đây." />
          )}
          {page.hasMore ? <Button title="Xem thêm" variant="text" onPress={page.loadMore} /> : null}
        </>
      )}
    </Screen>
  )
}
