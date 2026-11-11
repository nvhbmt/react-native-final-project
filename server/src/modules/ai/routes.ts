import { and, desc, eq, inArray, lt, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'

import type { Db } from '@/db/client.ts'
import { aiConversations, aiMessages, catalogProducts, orders, type AiConversationRow, type AiMessageRow } from '@/db/schema.ts'
import { AppError, ok } from '@/lib/http.ts'
import { rateLimit } from '@/lib/rateLimit.ts'
import { validate } from '@/lib/validate.ts'
import { requireAuth, type AuthVariables } from '@/middleware/auth.ts'
import type { CatalogService } from '@/modules/catalog/service.ts'
import { serializeOrder } from '@/modules/orders/routes.ts'
import type { ChatMessage, ChatProvider } from './provider.ts'
import { createToolRunner, TOOL_SPECS } from './tools.ts'

const HISTORY_LIMIT = 20
const MAX_TOOL_ROUNDS = 4

const idParam = z.object({ id: z.uuid() })
const createInput = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  productId: z.string().regex(/^[a-z0-9-]{1,160}$/).optional(),
  orderId: z.uuid().optional(),
})
const messagesQuery = z.object({
  limit: z.string().regex(/^\d{1,2}$/).transform(Number).pipe(z.number().int().min(1).max(50)).default(30),
  before: z.uuid().optional(),
})

const serializeConversation = (row: AiConversationRow) => ({
  id: row.id, title: row.title, productId: row.productId, orderId: row.orderId,
  createdAt: row.createdAt.getTime(), updatedAt: row.updatedAt.getTime(),
})
const serializeMessage = (row: AiMessageRow) => ({
  id: row.id, role: row.role, content: row.content, status: row.status, rating: row.rating, createdAt: row.createdAt.getTime(),
})

const SYSTEM_PROMPT = `Bạn là trợ lý mua sắm của ứng dụng MobiMart (điện tử, thời trang, làm đẹp, trái cây).
- Trả lời ngắn gọn, thân thiện, bằng ngôn ngữ người dùng đang dùng (mặc định tiếng Việt).
- Giá trong cửa hàng tính bằng USD. Khi thanh toán chuyển khoản, hệ thống tự quy đổi sang VND.
- Chỉ giới thiệu sản phẩm có thật: dùng tool search_products / get_product, không bịa tên, giá hay tính năng.
- Khi nhắc tới sản phẩm, ghi kèm id dạng [product:<id>] để ứng dụng hiển thị liên kết.
- Câu hỏi về đơn hàng: dùng list_my_orders. Không hứa hoàn tiền hay thay đổi đơn; hướng người dùng tới mục Đơn hàng hoặc bộ phận hỗ trợ.
- Từ chối lịch sự các yêu cầu không liên quan tới mua sắm.`

export type AiDeps = { db: Db; accessSecret: string; provider?: ChatProvider; catalog?: CatalogService; messagesPerHour?: number }

export function aiRoutes({ db, accessSecret, provider, catalog, messagesPerHour = 30 }: AiDeps) {
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use('/ai/*', requireAuth(accessSecret))
  /** Câu trả lời đang stream: messageId → controller (để endpoint /stop huỷ được). */
  const active = new Map<string, { userId: string; controller: AbortController }>()
  const sendLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: messagesPerHour,
    key: (c) => `ai:${(c.get('auth' as never) as { sub: string }).sub}`,
  })

  async function ownConversation(id: string, userId: string) {
    const [row] = await db.select().from(aiConversations).where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId)))
    if (!row) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Không tìm thấy hội thoại')
    return row
  }

  /** Ngữ cảnh gắn với hội thoại (sản phẩm đang xem / đơn hàng của chính user). */
  async function contextNote(conversation: AiConversationRow) {
    const notes: string[] = []
    if (conversation.productId && catalog) {
      const product = await catalog.detail(conversation.productId).catch(() => null)
      if (product) notes.push(`Người dùng đang hỏi về sản phẩm [product:${product.id}] ${product.name}, giá ${product.price} USD.`)
    }
    if (conversation.orderId) {
      const [order] = await db.select().from(orders).where(and(eq(orders.id, conversation.orderId), eq(orders.userId, conversation.userId)))
      if (order) {
        const view = serializeOrder(order)
        notes.push(`Người dùng đang hỏi về đơn #${view.code} (${view.status}${view.fulfillment ? `, giao hàng: ${view.fulfillment}` : ''}, ${view.total} USD): ${view.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}.`)
      }
    }
    return notes.join('\n')
  }

  return app
    .get('/ai/conversations', async (c) => {
      const rows = await db.select().from(aiConversations).where(eq(aiConversations.userId, c.var.auth.sub))
        .orderBy(desc(aiConversations.updatedAt)).limit(100)
      return ok(c, { items: rows.map(serializeConversation), available: Boolean(provider) })
    })
    .post('/ai/conversations', validate('json', createInput), async (c) => {
      const userId = c.var.auth.sub
      const input = c.req.valid('json')
      let title = input.title
      if (input.productId) {
        const [product] = await db.select({ name: catalogProducts.name }).from(catalogProducts).where(eq(catalogProducts.id, input.productId))
        if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm')
        title ??= product.name
      }
      if (input.orderId) {
        const [order] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.id, input.orderId), eq(orders.userId, userId)))
        if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng')
        title ??= `Đơn #${order.id.slice(0, 8).toUpperCase()}`
      }
      const [row] = await db.insert(aiConversations).values({
        userId, title: title ?? 'Cuộc trò chuyện mới', productId: input.productId ?? null, orderId: input.orderId ?? null,
      }).returning()
      return ok(c, serializeConversation(row!), 201)
    })
    .get('/ai/conversations/:id', validate('param', idParam), async (c) =>
      ok(c, serializeConversation(await ownConversation(c.req.valid('param').id, c.var.auth.sub))))
    .delete('/ai/conversations/:id', validate('param', idParam), async (c) => {
      const conversation = await ownConversation(c.req.valid('param').id, c.var.auth.sub)
      for (const [messageId, entry] of active) {
        if (entry.userId === c.var.auth.sub) {
          const [row] = await db.select({ conversationId: aiMessages.conversationId }).from(aiMessages).where(eq(aiMessages.id, messageId))
          if (row?.conversationId === conversation.id) entry.controller.abort()
        }
      }
      await db.delete(aiConversations).where(eq(aiConversations.id, conversation.id))
      return ok(c, { deleted: true })
    })
    /** Lịch sử, phân trang ngược: trả tin cũ → mới; `before` = id tin cũ nhất đang có. */
    .get('/ai/conversations/:id/messages', validate('param', idParam), validate('query', messagesQuery), async (c) => {
      const conversation = await ownConversation(c.req.valid('param').id, c.var.auth.sub)
      const { limit, before } = c.req.valid('query')
      const inConversation = eq(aiMessages.conversationId, conversation.id)
      const [anchor] = before
        ? await db.select({ id: aiMessages.id, createdAt: aiMessages.createdAt }).from(aiMessages).where(and(inConversation, eq(aiMessages.id, before)))
        : []
      if (before && !anchor) throw new AppError(400, 'INVALID_CURSOR', 'Cursor không hợp lệ')
      const rows = await db.select().from(aiMessages)
        .where(and(inConversation, anchor ? or(lt(aiMessages.createdAt, anchor.createdAt), and(eq(aiMessages.createdAt, anchor.createdAt), lt(aiMessages.id, anchor.id))) : undefined))
        .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id)).limit(limit + 1)
      const page = rows.slice(0, limit)
      return ok(c, { items: page.reverse().map(serializeMessage), hasMore: rows.length > limit })
    })
    /**
     * Gửi tin nhắn; trả lời stream qua SSE:
     *   event `start`  { userMessage, assistantMessageId }
     *   event `tool`   { name }            — trợ lý đang tra cứu
     *   event `delta`  { text }
     *   event `done`   { message }         — status complete | stopped
     *   event `error`  { code, message, assistantMessage? }
     */
    .post('/ai/conversations/:id/messages', validate('param', idParam), validate('json', z.object({ content: z.string().trim().min(1).max(2000) })), sendLimit, async (c) => {
      const userId = c.var.auth.sub
      const conversation = await ownConversation(c.req.valid('param').id, userId)
      if (!provider) throw new AppError(503, 'AI_UNAVAILABLE', 'Trợ lý AI chưa được cấu hình trên máy chủ')
      if ([...active.values()].some((entry) => entry.userId === userId)) {
        throw new AppError(409, 'AI_BUSY', 'Trợ lý đang trả lời tin trước, vui lòng chờ hoặc bấm dừng')
      }

      const content = c.req.valid('json').content
      const [userMessage, assistant] = await db.transaction(async (tx) => {
        const [question] = await tx.insert(aiMessages).values({ conversationId: conversation.id, role: 'user', content, status: 'complete' }).returning()
        // +1ms để thứ tự (created_at) luôn là câu hỏi trước, trả lời sau.
        const [answer] = await tx.insert(aiMessages).values({
          conversationId: conversation.id, role: 'assistant', content: '', status: 'streaming', createdAt: new Date(question!.createdAt.getTime() + 1),
        }).returning()
        const isFirst = conversation.title === 'Cuộc trò chuyện mới'
        await tx.update(aiConversations).set({ updatedAt: new Date(), ...(isFirst ? { title: content.slice(0, 60) } : {}) })
          .where(eq(aiConversations.id, conversation.id))
        return [question!, answer!]
      })

      const history = (await db.select().from(aiMessages)
        .where(and(eq(aiMessages.conversationId, conversation.id), inArray(aiMessages.status, ['complete', 'stopped'])))
        .orderBy(desc(aiMessages.createdAt)).limit(HISTORY_LIMIT)).reverse()
      const context = await contextNote(conversation)
      const messages: ChatMessage[] = [
        { role: 'system', content: context ? `${SYSTEM_PROMPT}\n\n${context}` : SYSTEM_PROMPT },
        ...history.filter((m) => m.content).map((m): ChatMessage => (m.role === 'user' ? { role: 'user', content: m.content } : { role: 'assistant', content: m.content })),
      ]

      const controller = new AbortController()
      active.set(assistant.id, { userId, controller })
      const runTool = createToolRunner(db, catalog, userId)
      let answer = ''
      const finish = async (status: AiMessageRow['status']) => {
        active.delete(assistant.id)
        const [saved] = await db.update(aiMessages).set({ content: answer, status }).where(eq(aiMessages.id, assistant.id)).returning()
        return saved ? serializeMessage(saved) : null
      }

      return streamSSE(c, async (stream) => {
        stream.onAbort(() => controller.abort())
        await stream.writeSSE({ event: 'start', data: JSON.stringify({ userMessage: serializeMessage(userMessage), assistantMessageId: assistant.id }) })
        try {
          for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
            let calls: Extract<ChatMessage, { role: 'assistant' }>['tool_calls']
            let roundText = ''
            for await (const event of provider.stream(messages, round < MAX_TOOL_ROUNDS ? TOOL_SPECS : [], controller.signal)) {
              if (event.type === 'text') {
                roundText += event.text
                answer += event.text
                await stream.writeSSE({ event: 'delta', data: JSON.stringify({ text: event.text }) })
              } else {
                calls = event.calls
              }
            }
            if (!calls?.length) break
            messages.push({ role: 'assistant', content: roundText || null, tool_calls: calls })
            for (const call of calls) {
              await stream.writeSSE({ event: 'tool', data: JSON.stringify({ name: call.function.name }) })
              const result = await runTool(call.function.name, call.function.arguments)
              messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 8000) })
            }
          }
          const message = await finish(controller.signal.aborted ? 'stopped' : 'complete')
          if (!stream.aborted) await stream.writeSSE({ event: 'done', data: JSON.stringify({ message }) })
        } catch (error) {
          if (controller.signal.aborted) {
            const message = await finish('stopped')
            if (!stream.aborted) await stream.writeSSE({ event: 'done', data: JSON.stringify({ message }) })
            return
          }
          console.error('[ai]', error)
          const message = await finish('error')
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({ code: 'AI_ERROR', message: 'Trợ lý đang gặp sự cố, vui lòng thử lại sau', assistantMessage: message }),
          })
        }
      })
    })
    .post('/ai/conversations/:id/messages/:messageId/stop', validate('param', z.object({ id: z.uuid(), messageId: z.uuid() })), async (c) => {
      const { id, messageId } = c.req.valid('param')
      await ownConversation(id, c.var.auth.sub)
      const entry = active.get(messageId)
      if (entry?.userId === c.var.auth.sub) entry.controller.abort()
      return ok(c, { stopped: Boolean(entry) })
    })
    .post('/ai/messages/:id/rating', validate('param', idParam), validate('json', z.object({ rating: z.union([z.literal(1), z.literal(-1), z.null()]) })), async (c) => {
      const { id } = c.req.valid('param')
      const [row] = await db.select({ message: aiMessages }).from(aiMessages)
        .innerJoin(aiConversations, eq(aiMessages.conversationId, aiConversations.id))
        .where(and(eq(aiMessages.id, id), eq(aiConversations.userId, c.var.auth.sub), eq(aiMessages.role, 'assistant')))
      if (!row) throw new AppError(404, 'MESSAGE_NOT_FOUND', 'Không tìm thấy tin nhắn')
      const [updated] = await db.update(aiMessages).set({ rating: c.req.valid('json').rating }).where(eq(aiMessages.id, id)).returning()
      return ok(c, serializeMessage(updated!))
    })
}
