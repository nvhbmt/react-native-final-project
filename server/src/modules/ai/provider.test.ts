import { describe, expect, it } from 'vitest'

import { createOpenAiCompatibleProvider, type StreamEvent } from './provider.ts'

function sseResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  }), { status: 200 })
}

describe('provider tương thích OpenAI', () => {
  it('ghép text và tool_calls bị chia nhỏ qua nhiều chunk', async () => {
    let sent: any
    const provider = createOpenAiCompatibleProvider({ baseUrl: 'https://ai.example/v1/', apiKey: 'k', model: 'm' }, async (url, init) => {
      sent = { url, body: JSON.parse(String(init?.body)), auth: (init?.headers as Record<string, string>).Authorization }
      return sseResponse([
        'data: {"choices":[{"delta":{"content":"Xin "}}]}\n\ndata: {"choices":[{"delta":{"content":"chào"}}]}\n',
        '\ndata: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"search_","arguments":"{\\"query\\":"}}]}}]}\n\n',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"products","arguments":"\\"tv\\"}"}}]}}]}\n\ndata: [DONE]\n\n',
      ])
    })
    const events: StreamEvent[] = []
    for await (const event of provider.stream([{ role: 'user', content: 'hi' }], [], new AbortController().signal)) events.push(event)
    expect(sent).toMatchObject({ url: 'https://ai.example/v1/chat/completions', auth: 'Bearer k', body: { model: 'm', stream: true } })
    expect(events).toEqual([
      { type: 'text', text: 'Xin ' },
      { type: 'text', text: 'chào' },
      { type: 'tool_calls', calls: [{ id: 'c1', type: 'function', function: { name: 'search_products', arguments: '{"query":"tv"}' } }] },
    ])
  })

  it('ném lỗi khi nhà cung cấp trả mã lỗi', async () => {
    const provider = createOpenAiCompatibleProvider({ baseUrl: 'https://ai.example', apiKey: 'k', model: 'm' }, async () => new Response('quota', { status: 429 }))
    await expect(async () => {
      for await (const _ of provider.stream([], [], new AbortController().signal)) void _
    }).rejects.toThrow('429')
  })
})
