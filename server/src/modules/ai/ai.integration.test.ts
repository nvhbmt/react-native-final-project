import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createCatalogRepository } from '@/modules/catalog/repository.ts'
import { createCatalogService } from '@/modules/catalog/service.ts'
import { commerceTestUrl, startCommerceTest } from '@/test/integration.ts'
import type { ChatMessage, ChatProvider } from './provider.ts'

/** Model giả: lượt đầu gọi tool search_products, lượt sau trả lời dựa trên kết quả tool. */
function scriptedProvider(seen: ChatMessage[][]): ChatProvider {
  return {
    async *stream(messages, _tools, signal) {
      seen.push(structuredClone(messages))
      const last = messages.at(-1)!
      if (last.role === 'user' && last.content.includes('chậm')) {
        yield { type: 'text', text: 'Đang ' }
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 5000)
          signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('aborted')) })
        })
        return
      }
      if (last.role === 'user') {
        yield { type: 'tool_calls', calls: [{ id: 't1', type: 'function', function: { name: 'search_products', arguments: '{"query":"banana"}' } }] }
        return
      }
      const products = JSON.parse((last as { content: string }).content) as { id: string }[]
      yield { type: 'text', text: 'Gợi ý: ' }
      yield { type: 'text', text: `[product:${products[0]!.id}]` }
    },
  }
}

function parseSse(text: string) {
  return text.split('\n\n').filter(Boolean).map((block) => {
    const event = block.match(/^event: (.*)$/m)?.[1]
    const data = block.match(/^data: (.*)$/m)?.[1]
    return { event, data: data ? JSON.parse(data) : null }
  })
}

describe.skipIf(!commerceTestUrl)('trợ lý AI', () => {
  let t: Awaited<ReturnType<typeof startCommerceTest>>
  const seen: ChatMessage[][] = []
  beforeAll(async () => {
    t = await startCommerceTest((db) => ({ ai: scriptedProvider(seen), catalog: createCatalogService(createCatalogRepository(db)) }))
  })
  afterAll(async () => { await t?.stop() })

  const send = (token: string, id: string, content: string) => t.app.request(`/api/v1/ai/conversations/${id}/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content }),
  })

  it('stream câu trả lời có gọi tool, lưu lịch sử, đặt tiêu đề và đánh giá', async () => {
    const { token } = await t.register()
    const conversation = (await t.call('POST', '/ai/conversations', { token, body: { productId: 'banana' } })).body.data
    expect(conversation.title).toBeTruthy()

    const res = await send(token, conversation.id, 'Có chuối không?')
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const events = parseSse(await res.text())
    expect(events.map((e) => e.event)).toEqual(['start', 'tool', 'delta', 'delta', 'done'])
    expect(events.at(-1)!.data.message).toMatchObject({ role: 'assistant', status: 'complete', content: expect.stringContaining('[product:') })
    expect(seen[0]![0]!.content).toContain('[product:banana]') // ngữ cảnh sản phẩm trong system prompt

    const history = (await t.call('GET', `/ai/conversations/${conversation.id}/messages`, { token })).body.data
    expect(history.items.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant'])
    const answerId = history.items[1].id
    expect((await t.call('POST', `/ai/messages/${answerId}/rating`, { token, body: { rating: 1 } })).body.data.rating).toBe(1)
    expect((await t.call('POST', `/ai/messages/${history.items[0].id}/rating`, { token, body: { rating: 1 } })).status).toBe(404)
  })

  it('dừng câu trả lời đang stream và giữ phần đã trả lời', async () => {
    const { token } = await t.register()
    const conversation = (await t.call('POST', '/ai/conversations', { token, body: {} })).body.data
    const pending = send(token, conversation.id, 'trả lời chậm thôi')
    const res = await pending
    const reader = res.body!.getReader()
    const first = new TextDecoder().decode((await reader.read()).value)
    const { assistantMessageId } = parseSse(first)[0]!.data
    expect((await t.call('POST', `/ai/conversations/${conversation.id}/messages/${assistantMessageId}/stop`, { token })).body.data.stopped).toBe(true)
    let rest = ''
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) rest += new TextDecoder().decode(chunk.value)
    const done = parseSse(first + rest).find((e) => e.event === 'done')
    expect(done!.data.message).toMatchObject({ status: 'stopped', content: 'Đang ' })
    expect((await t.call('GET', '/ai/conversations', { token })).body.data.items[0].title).toBe('trả lời chậm thôi')
  })

  it('cô lập hội thoại theo user và xoá được', async () => {
    const a = await t.register()
    const b = await t.register()
    const conversation = (await t.call('POST', '/ai/conversations', { token: a.token, body: {} })).body.data
    expect((await t.call('GET', `/ai/conversations/${conversation.id}`, { token: b.token })).status).toBe(404)
    expect((await send(b.token, conversation.id, 'hi')).status).toBe(404)
    expect((await t.call('POST', '/ai/conversations', { token: b.token, body: { orderId: crypto.randomUUID() } })).status).toBe(404)
    expect((await t.call('DELETE', `/ai/conversations/${conversation.id}`, { token: a.token })).status).toBe(200)
    expect((await t.call('GET', '/ai/conversations', { token: a.token })).body.data).toMatchObject({ items: [], available: true })
  })

  it('không cấu hình model thì gửi tin trả 503', async () => {
    const plain = await startCommerceTest()
    try {
      const { token } = await plain.register()
      const conversation = (await plain.call('POST', '/ai/conversations', { token, body: {} })).body.data
      const res = await plain.call('POST', `/ai/conversations/${conversation.id}/messages`, { token, body: { content: 'hi' } })
      expect(res.body.error.code).toBe('AI_UNAVAILABLE')
    } finally {
      await plain.stop()
    }
  })
})
