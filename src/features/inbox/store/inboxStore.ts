import { AppState } from 'react-native'
import { create } from 'zustand'

import { useAuthStore } from '@/features/auth'
import { api } from '@/lib/api'

export type InboxMessage = {
  id: string
  kind: 'order' | 'payment' | 'feedback' | 'system'
  title: string
  body: string
  data: { orderId?: string; productId?: string }
  read: boolean
  createdAt: number
}
export type InboxPage = { items: InboxMessage[]; nextCursor: string | null; unreadCount: number }

type InboxState = {
  unreadCount: number
  /** Tăng để màn Inbox tải lại danh sách. */
  revision: number
  refreshUnread: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

export const useInboxStore = create<InboxState>((set) => ({
  unreadCount: 0,
  revision: 0,
  async refreshUnread() {
    if (!useAuthStore.getState().user) return
    try {
      const { unreadCount } = await api.get<{ unreadCount: number }>('/inbox/unread-count')
      set({ unreadCount })
    } catch {
      // Bỏ qua: badge giữ số cũ.
    }
  },
  async markRead(id) {
    const { unreadCount } = await api.post<{ unreadCount: number }>(`/inbox/${id}/read`)
    set((s) => ({ unreadCount, revision: s.revision + 1 }))
  },
  async markAllRead() {
    await api.post('/inbox/read-all')
    set((s) => ({ unreadCount: 0, revision: s.revision + 1 }))
  },
}))

const POLL_MS = 60_000

/** Cập nhật badge khi đăng nhập, khi app trở lại foreground và mỗi phút. */
export function startInboxSync() {
  let current: string | null = null
  const refresh = () => void useInboxStore.getState().refreshUnread()
  const onUser = (userId: string | null) => {
    if (userId === current) return
    current = userId
    if (userId) refresh()
    else useInboxStore.setState({ unreadCount: 0 })
  }
  onUser(useAuthStore.getState().user?.id ?? null)
  const unsubscribe = useAuthStore.subscribe((state) => onUser(state.user?.id ?? null))
  const appState = AppState.addEventListener('change', (state) => { if (state === 'active' && current) refresh() })
  const timer = setInterval(() => { if (current) refresh() }, POLL_MS)
  return () => {
    unsubscribe()
    appState.remove()
    clearInterval(timer)
  }
}
