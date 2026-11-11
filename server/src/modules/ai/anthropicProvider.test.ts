import { describe, expect, it } from 'vitest'

import { createAnthropicProvider } from './anthropicProvider.ts'
import type { ChatMessage, StreamEvent, ToolSpec } from './provider.ts'

const config = { apiKey: 'test-only-key', model: 'claude-haiku-5-5' }
const tool: ToolSpec = { type: 'function', function: { name: 'search_products', description: 'Tìm sản phẩm', parameters: { type: 'object', properties: { query: { type: 'string' } } } } }

function event(type: string, data: Record<string, unknown>) {
  return `event: ${type}\r\ndata: ${JSON.stringify({ type, ...data })}\r\n\r\n`
}

function streamedResponse(text: string, chunkSize = 19) {
  const bytes = new TextEncoder().encode(text)
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize))
      controller.close()
    },
  }), { status: 200 })
}

async function collect(provider: ReturnType<typeof createAnthropicProvider>, messages: ChatMessage[], tools: ToolSpec[] = []) {
  const events: StreamEvent[] = []
  for await (const item of provider.stream(messages, tools, new AbortController().signal)) events.push(item)
  return events
}

describe('Anthropic Messages provider', () => {
  it('gửi system, lịch sử tool và parse text/tool stream qua nhiều network chunk', async () => {
    let sent: { url: string; headers: Record<string, string>; body: Record<string, any> } | undefined
    const stream = [
      event('message_start', { message: { content: [] } }),
      event('ping', {}),
      event('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }),
      event('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'Có ' } }),
      event('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'chuối 🍌' } }),
      event('content_block_stop', { index: 0 }),
      event('content_block_start', { index: 1, content_block: { type: 'tool_use', id: 'tool_2', name: 'search_products', input: {} } }),
      event('content_block_delta', { index: 1, delta: { type: 'input_json_delta', partial_json: '{"query":' } }),
      event('content_block_delta', { index: 1, delta: { type: 'input_json_delta', partial_json: '"banana"}' } }),
      event('content_block_stop', { index: 1 }),
      event('message_delta', { delta: { stop_reason: 'tool_use' } }),
      event('message_stop', {}),
    ].join('')
    const provider = createAnthropicProvider(config, async (url, init) => {
      sent = { url: String(url), headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) }
      return streamedResponse(stream)
    })
    const messages: ChatMessage[] = [
      { role: 'system', content: 'Bạn là trợ lý bán hàng' },
      { role: 'user', content: 'Có chuối không?' },
      { role: 'assistant', content: null, tool_calls: [
        { id: 'tool_1', type: 'function', function: { name: 'search_products', arguments: '{"query":"fruit"}' } },
      ] },
      { role: 'tool', tool_call_id: 'tool_1', content: '[{"id":"banana"}]' },
    ]
    expect(await collect(provider, messages, [tool])).toEqual([
      { type: 'text', text: 'Có ' },
      { type: 'text', text: 'chuối 🍌' },
      { type: 'tool_calls', calls: [{ id: 'tool_2', type: 'function', function: { name: 'search_products', arguments: '{"query":"banana"}' } }] },
    ])
    expect(sent?.url).toBe('https://api.anthropic.com/v1/messages')
    expect(sent?.headers).toMatchObject({ 'x-api-key': config.apiKey, 'anthropic-version': '2026-10-21' })
    expect(sent?.body).toMatchObject({ model: config.model, max_tokens: 1024, system: 'Bạn là trợ lý bán hàng', stream: true })
    expect(sent?.body.tools).toEqual([{ name: 'search_products', description: 'Tìm sản phẩm', input_schema: tool.function.parameters }])
    expect(sent?.body.messages).toEqual([
      { role: 'user', content: 'Có chuối không?' },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'tool_1', name: 'search_products', input: { query: 'fruit' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tool_1', content: '[{"id":"banana"}]' }] },
    ])
    expect(JSON.stringify(sent?.body)).not.toContain(config.apiKey)
  })

  it('báo lỗi HTTP, lỗi trong stream và stream chưa kết thúc', async () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'xin chào' }]
    const badHttp = createAnthropicProvider(config, async () => new Response('invalid key', { status: 401 }))
    await expect(collect(badHttp, messages)).rejects.toThrow('HTTP 401')

    const streamError = createAnthropicProvider(config, async () => streamedResponse(event('error', { error: { type: 'overloaded_error' } })))
    await expect(collect(streamError, messages)).rejects.toThrow('overloaded_error')

    const truncated = createAnthropicProvider(config, async () => streamedResponse(event('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'Nửa câu' } })))
    await expect(collect(truncated, messages)).rejects.toThrow('trước message_stop')

    const maxTokens = createAnthropicProvider(config, async () => streamedResponse(event('message_delta', { delta: { stop_reason: 'max_tokens' } }) + event('message_stop', {})))
    await expect(collect(maxTokens, messages)).rejects.toThrow('output token')
  })
})
