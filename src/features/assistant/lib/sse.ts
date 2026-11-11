export type SseEvent = { event: string; data: string }

/**
 * Tách luồng text/event-stream thành các sự kiện. Hàm thuần (không phụ thuộc RN) để test;
 * trả về các sự kiện đầy đủ và phần dư chưa kết thúc.
 */
export function parseSseChunk(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = []
  const normalized = buffer.replace(/\r\n/g, '\n')
  const blocks = normalized.split('\n\n')
  const rest = blocks.pop() ?? ''
  for (const block of blocks) {
    let event = 'message'
    const data: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
    }
    if (data.length) events.push({ event, data: data.join('\n') })
  }
  return { events, rest }
}

/** Tách nội dung trả lời thành đoạn text và liên kết sản phẩm `[product:<id>]`. */
export function splitProductLinks(text: string): ({ type: 'text'; text: string } | { type: 'product'; id: string })[] {
  const parts: ({ type: 'text'; text: string } | { type: 'product'; id: string })[] = []
  const pattern = /\[product:([a-z0-9-]{1,160})\]/g
  let last = 0
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) parts.push({ type: 'text', text: text.slice(last, match.index) })
    parts.push({ type: 'product', id: match[1]! })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) })
  return parts
}
