/**
 * Gọi model qua API tương thích OpenAI Chat Completions (`AI_BASE_URL`/chat/completions, stream).
 * Hầu hết nhà cung cấp (OpenAI, OpenRouter, Groq, Ollama, Anthropic OpenAI-compat...) đều hỗ trợ.
 */

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }
export type ToolSpec = { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }

export type StreamEvent = { type: 'text'; text: string } | { type: 'tool_calls'; calls: ToolCall[] }

export interface ChatProvider {
  /** Stream một lượt trả lời. Kết thúc bằng `tool_calls` nếu model muốn gọi tool. */
  stream(messages: ChatMessage[], tools: ToolSpec[], signal: AbortSignal): AsyncIterable<StreamEvent>
}

export type ProviderConfig = { baseUrl: string; apiKey: string; model: string }

async function* sseData(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    let newline: number
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (line.startsWith('data:')) yield line.slice(5).trim()
    }
  }
}

export function createOpenAiCompatibleProvider(config: ProviderConfig, fetchImpl: typeof fetch = fetch): ChatProvider {
  return {
    async *stream(messages, tools, signal) {
      const response = await fetchImpl(`${config.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages, stream: true, ...(tools.length ? { tools } : {}) }),
      })
      if (!response.ok || !response.body) {
        throw new Error(`AI provider trả ${response.status}: ${(await response.text().catch(() => '')).slice(0, 300)}`)
      }
      const calls: ToolCall[] = []
      for await (const data of sseData(response.body)) {
        if (data === '[DONE]') break
        let chunk: any
        try {
          chunk = JSON.parse(data)
        } catch {
          continue
        }
        const delta = chunk.choices?.[0]?.delta
        if (typeof delta?.content === 'string' && delta.content) yield { type: 'text', text: delta.content }
        for (const part of delta?.tool_calls ?? []) {
          const call = (calls[part.index ?? 0] ??= { id: '', type: 'function', function: { name: '', arguments: '' } })
          if (part.id) call.id = part.id
          if (part.function?.name) call.function.name += part.function.name
          if (part.function?.arguments) call.function.arguments += part.function.arguments
        }
      }
      const ready = calls.filter((call) => call?.function.name)
      if (ready.length) yield { type: 'tool_calls', calls: ready.map((call, i) => ({ ...call, id: call.id || `call_${i}` })) }
    },
  }
}
