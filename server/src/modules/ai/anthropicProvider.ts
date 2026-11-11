import type { ChatMessage, ChatProvider, ToolCall, ToolSpec } from './provider.ts'

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2026-10-21'

type AnthropicBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }
type AnthropicMessage = { role: 'user' | 'assistant'; content: string | AnthropicBlock[] }

function toolInput(raw: string): Record<string, unknown> {
  const input: unknown = JSON.parse(raw || '{}')
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Tham số tool từ model không hợp lệ')
  return input as Record<string, unknown>
}

function toAnthropicMessages(messages: ChatMessage[]) {
  let system = ''
  const converted: AnthropicMessage[] = []
  for (const message of messages) {
    if (message.role === 'system') {
      system += `${system ? '\n\n' : ''}${message.content}`
    } else if (message.role === 'user') {
      converted.push({ role: 'user', content: message.content })
    } else if (message.role === 'assistant') {
      if (!message.tool_calls?.length) {
        converted.push({ role: 'assistant', content: message.content ?? '' })
        continue
      }
      const blocks: AnthropicBlock[] = []
      if (message.content) blocks.push({ type: 'text', text: message.content })
      for (const call of message.tool_calls) {
        blocks.push({ type: 'tool_use', id: call.id, name: call.function.name, input: toolInput(call.function.arguments) })
      }
      converted.push({ role: 'assistant', content: blocks })
    } else if (message.role === 'tool') {
      const block: AnthropicBlock = { type: 'tool_result', tool_use_id: message.tool_call_id, content: message.content }
      const last = converted.at(-1)
      if (last?.role === 'user' && Array.isArray(last.content) && last.content.every((part) => part.type === 'tool_result')) {
        last.content.push(block)
      } else {
        converted.push({ role: 'user', content: [block] })
      }
    }
  }
  return { system, messages: converted }
}

async function* sseEvents(body: ReadableStream<Uint8Array>): AsyncIterable<Record<string, unknown>> {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    buffer = buffer.replace(/\r\n/g, '\n')
    let boundary: number
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const data = frame.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n')
      if (data) {
        const parsed: unknown = JSON.parse(data)
        if (parsed && typeof parsed === 'object') yield parsed as Record<string, unknown>
      }
    }
  }
}

export function createAnthropicProvider(
  config: { apiKey: string; model: string; maxTokens?: number },
  fetchImpl: typeof fetch = fetch,
): ChatProvider {
  return {
    async *stream(messages, tools, signal) {
      const input = toAnthropicMessages(messages)
      const response = await fetchImpl(MESSAGES_URL, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          'x-api-key': config.apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens ?? 1024,
          system: input.system,
          messages: input.messages,
          stream: true,
          ...(tools.length ? { tools: tools.map((tool: ToolSpec) => ({
            name: tool.function.name,
            description: tool.function.description,
            input_schema: tool.function.parameters,
          })) } : {}),
        }),
      })
      if (!response.ok || !response.body) throw new Error(`Anthropic API trả HTTP ${response.status}`)

      const calls = new Map<number, { id: string; name: string; input: string; initialInput: Record<string, unknown> }>()
      let stopReason: string | undefined
      let completed = false
      for await (const event of sseEvents(response.body)) {
        if (event.type === 'error') {
          const error = event.error as { type?: string } | undefined
          throw new Error(`Anthropic stream lỗi: ${error?.type ?? 'unknown'}`)
        }
        if (event.type === 'content_block_start') {
          const block = event.content_block as { type?: string; id?: string; name?: string; input?: Record<string, unknown> } | undefined
          if (block?.type === 'tool_use' && typeof event.index === 'number') {
            calls.set(event.index, { id: block.id ?? '', name: block.name ?? '', input: '', initialInput: block.input ?? {} })
          }
        }
        if (event.type === 'content_block_delta') {
          const delta = event.delta as { type?: string; text?: string; partial_json?: string } | undefined
          if (delta?.type === 'text_delta' && delta.text) yield { type: 'text', text: delta.text }
          if (delta?.type === 'input_json_delta' && typeof event.index === 'number') {
            const call = calls.get(event.index)
            if (call) call.input += delta.partial_json ?? ''
          }
        }
        if (event.type === 'message_delta') {
          const delta = event.delta as { stop_reason?: string } | undefined
          stopReason = delta?.stop_reason ?? stopReason
        }
        if (event.type === 'message_stop') {
          completed = true
          break
        }
      }
      if (!completed) throw new Error('Anthropic stream kết thúc trước message_stop')
      if (stopReason === 'max_tokens') throw new Error('Anthropic đã đạt giới hạn output token')
      if (calls.size) {
        const ready: ToolCall[] = [...calls.entries()].sort(([a], [b]) => a - b).map(([, call]) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: JSON.stringify(call.input ? toolInput(call.input) : call.initialInput) },
        }))
        if (ready.some((call) => !call.id || !call.function.name)) throw new Error('Anthropic trả tool call không đầy đủ')
        yield { type: 'tool_calls', calls: ready }
      }
    },
  }
}
