import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router, useFocusEffect } from 'expo-router'
import { Fragment, useCallback } from 'react'

import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
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
  }

  return (
    <Screen title="Inbox" contentClassName="gap-3 pt-2 pb-6">
      {auth === 'guest' ? (
        <View className="flex-1 items-center justify-center gap-3 px-6 py-16">
          <Ionicons name="mail-outline" size={56} color={appColors.primary} />
          <Text className="text-center text-[14px] leading-[22px] text-neutral-600">Đăng nhập để nhận thông báo về đơn hàng và thanh toán.</Text>
          <Button title="Log in" className="w-full" onPress={() => router.push('/login')} />
        </View>
      ) : (
        <>
          {unreadCount > 0 ? (
            <Text role="button" onPress={() => void markAllRead().catch(() => undefined)} className="self-end px-4 text-[13px] font-bold text-primary">
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
            <Text className="py-16 text-center text-[14px] leading-[22px] text-neutral-500">Chưa có thông báo nào.</Text>
          )}
          {page.hasMore ? <Button title="Xem thêm" variant="text" onPress={page.loadMore} /> : null}
        </>
      )}
    </Screen>
  )
}
