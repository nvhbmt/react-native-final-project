import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError } from '@/lib/api'

import { assistantApi, streamMessage, type ChatMessage } from '../api/assistantApi'

const TOOL_LABELS: Record<string, string> = {
  search_products: 'Đang tìm sản phẩm…',
  get_product: 'Đang xem chi tiết sản phẩm…',
  list_my_orders: 'Đang xem đơn hàng của bạn…',
}

/** Trạng thái một cuộc hội thoại: lịch sử, gửi tin (stream), dừng, đánh giá. */
export function useChat(conversationId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streaming, setStreaming] = useState<{ messageId: string | null; activity: string | null } | null>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!conversationId) return
    let alive = true
    assistantApi.messages(conversationId).then(
      (page) => { if (alive) { setMessages(page.items); setHasMore(page.hasMore); setLoading(false) } },
      (e: unknown) => { if (alive) { setError(e instanceof ApiError ? e.message : 'Không tải được hội thoại'); setLoading(false) } },
    )
    return () => {
      alive = false
      controller.current?.abort()
    }
  }, [conversationId])

  const loadOlder = useCallback(async () => {
    if (!conversationId || !messages[0]) return
    const page = await assistantApi.messages(conversationId, messages[0].id)
    setMessages((current) => [...page.items, ...current])
    setHasMore(page.hasMore)
  }, [conversationId, messages])

  const patchAssistant = (id: string, patch: (m: ChatMessage) => ChatMessage) =>
    setMessages((current) => current.map((m) => (m.id === id ? patch(m) : m)))

  const send = useCallback(async (content: string) => {
    if (!conversationId || streaming || !content.trim()) return
    setError(null)
    const abort = new AbortController()
    controller.current = abort
    setStreaming({ messageId: null, activity: 'Đang suy nghĩ…' })
    let assistantId: string | null = null
    try {
      await streamMessage(conversationId, content.trim(), {
        onStart: (userMessage, id) => {
          assistantId = id
          setStreaming({ messageId: id, activity: 'Đang suy nghĩ…' })
          setMessages((current) => [...current, userMessage, { id, role: 'assistant', content: '', status: 'streaming', rating: null, createdAt: Date.now() }])
        },
        onDelta: (text) => {
          setStreaming((s) => (s ? { ...s, activity: null } : s))
          if (assistantId) patchAssistant(assistantId, (m) => ({ ...m, content: m.content + text }))
        },
        onTool: (name) => setStreaming((s) => (s ? { ...s, activity: TOOL_LABELS[name] ?? 'Đang tra cứu…' } : s)),
        onDone: (message) => { if (message) patchAssistant(message.id, () => message) },
        onError: (message, saved) => {
          setError(message)
          if (saved) patchAssistant(saved.id, () => saved)
        },
      }, abort.signal)
    } catch (e) {
      if (!abort.signal.aborted) setError(e instanceof ApiError ? e.message : 'Không gửi được tin nhắn, vui lòng thử lại')
      if (assistantId) patchAssistant(assistantId, (m) => ({ ...m, status: abort.signal.aborted ? 'stopped' : 'error' }))
    } finally {
      controller.current = null
      setStreaming(null)
    }
  }, [conversationId, streaming])

  const stop = useCallback(() => {
    if (!conversationId || !streaming?.messageId) {
      controller.current?.abort()
      return
    }
    // Server dừng model và lưu phần đã trả lời; stream kết thúc bằng sự kiện `done`.
    void assistantApi.stop(conversationId, streaming.messageId).catch(() => controller.current?.abort())
  }, [conversationId, streaming])

  const rate = useCallback(async (message: ChatMessage, rating: 1 | -1) => {
    const next = message.rating === rating ? null : rating
    patchAssistant(message.id, (m) => ({ ...m, rating: next }))
    await assistantApi.rate(message.id, next).catch(() => patchAssistant(message.id, (m) => ({ ...m, rating: message.rating })))
  }, [])

  return { messages, hasMore, loading, error, streaming, send, stop, rate, loadOlder }
}
