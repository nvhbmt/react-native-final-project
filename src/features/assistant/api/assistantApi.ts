import { fetch as streamingFetch } from 'expo/fetch'

import { useAuthStore } from '@/features/auth'
import { api, ApiError, getApiBaseUrl } from '@/lib/api'

import { parseSseChunk } from '../lib/sse'

export type Conversation = { id: string; title: string; productId: string | null; orderId: string | null; createdAt: number; updatedAt: number }
export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: 'streaming' | 'complete' | 'stopped' | 'error'
  rating: 1 | -1 | null
  createdAt: number
}

export const assistantApi = {
  list: () => api.get<{ items: Conversation[]; available: boolean }>('/ai/conversations'),
  create: (input: { productId?: string; orderId?: string } = {}) => api.post<Conversation>('/ai/conversations', input),
  get: (id: string) => api.get<Conversation>(`/ai/conversations/${id}`),
  remove: (id: string) => api.delete<{ deleted: true }>(`/ai/conversations/${id}`),
  messages: (id: string, before?: string) =>
    api.get<{ items: ChatMessage[]; hasMore: boolean }>(`/ai/conversations/${id}/messages?limit=30${before ? `&before=${before}` : ''}`),
  stop: (id: string, messageId: string) => api.post(`/ai/conversations/${id}/messages/${messageId}/stop`),
  rate: (messageId: string, rating: 1 | -1 | null) => api.post<ChatMessage>(`/ai/messages/${messageId}/rating`, { rating }),
}

export type StreamHandlers = {
  onStart: (userMessage: ChatMessage, assistantMessageId: string) => void
  onDelta: (text: string) => void
  onTool: (name: string) => void
  onDone: (message: ChatMessage | null) => void
  onError: (message: string, assistantMessage?: ChatMessage | null) => void
}

async function open(conversationId: string, content: string, token: string | null, signal: AbortSignal) {
  return streamingFetch(`${getApiBaseUrl()}/api/v1/ai/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ content }),
    signal,
  })
}

/**
 * Gửi tin và đọc câu trả lời stream (SSE). Dùng `expo/fetch` vì fetch mặc định của React Native
 * không đọc được body theo từng phần. Hết hạn access token thì refresh một lần rồi gửi lại.
 */
export async function streamMessage(conversationId: string, content: string, handlers: StreamHandlers, signal: AbortSignal) {
  const auth = useAuthStore.getState()
  let response = await open(conversationId, content, auth.accessToken, signal)
  if (response.status === 401) {
    const fresh = await auth.refresh()
    if (!fresh) throw new ApiError(401, 'UNAUTHORIZED', 'Phiên đăng nhập đã hết, vui lòng đăng nhập lại')
    response = await open(conversationId, content, fresh, signal)
  }
  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null
    throw new ApiError(response.status, payload?.error?.code ?? 'UNKNOWN_ERROR', payload?.error?.message ?? `Máy chủ trả lỗi ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSseChunk(buffer)
    buffer = rest
    for (const { event, data } of events) {
      const payload = JSON.parse(data)
      if (event === 'start') handlers.onStart(payload.userMessage, payload.assistantMessageId)
      else if (event === 'delta') handlers.onDelta(payload.text)
      else if (event === 'tool') handlers.onTool(payload.name)
      else if (event === 'done') handlers.onDone(payload.message)
      else if (event === 'error') handlers.onError(payload.message, payload.assistantMessage)
    }
  }
}
