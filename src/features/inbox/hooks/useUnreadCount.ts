import { useInboxStore } from '../store/inboxStore'

/** Số thông báo chưa đọc (badge tab Inbox). */
export function useUnreadCount(): number {
  return useInboxStore((s) => s.unreadCount)
}
