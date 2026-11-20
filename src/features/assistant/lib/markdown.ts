/**
 * Markdown rút gọn cho câu trả lời của trợ lý — chỉ những gì mô hình hay dùng:
 * đoạn văn, tiêu đề `#`, danh sách `-`/`*`/`1.`, **đậm**, *nghiêng*, `code`, [nhãn](url),
 * và thẻ sản phẩm `[product:<id>]`. Không phụ thuộc React Native để test bằng `node --test`.
 *
 * Đang stream nên cú pháp có thể chưa đóng (vd. `**iPhone` chưa có `**` cuối): khi đó giữ nguyên ký tự,
 * đến lượt chunk sau đóng lại thì tự hiện đúng.
 */

export type Inline =
  | { type: 'text'; text: string; bold?: boolean; italic?: boolean; code?: boolean }
  | { type: 'product'; id: string }

export type Block =
  | { type: 'paragraph'; inlines: Inline[] }
  | { type: 'heading'; inlines: Inline[] }
  | { type: 'list'; ordered: boolean; items: { marker: string; inlines: Inline[] }[] }

const HEADING = /^#{1,6}\s+(.*)$/
const BULLET = /^\s*[-*+]\s+(.*)$/
const ORDERED = /^\s*(\d{1,3})[.)]\s+(.*)$/

export function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  // `as`: TS thu hẹp biến bị closure gán lại về `null` trong vòng lặp → báo `never`.
  let list = null as { ordered: boolean; items: { marker: string; text: string }[] } | null

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', inlines: parseInline(paragraph.join('\n')) })
    paragraph = []
  }
  const flushList = () => {
    if (list) {
      blocks.push({
        type: 'list',
        ordered: list.ordered,
        items: list.items.map((item) => ({ marker: item.marker, inlines: parseInline(item.text) })),
      })
    }
    list = null
  }
  const addItem = (ordered: boolean, marker: string, itemText: string) => {
    flushParagraph()
    if (list && list.ordered !== ordered) flushList()
    list ??= { ordered, items: [] }
    list.items.push({ marker, text: itemText })
  }

  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = HEADING.exec(line)
    const bullet = BULLET.exec(line)
    const ordered = ORDERED.exec(line)
    if (!line.trim()) {
      flushParagraph()
      flushList()
    } else if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'heading', inlines: parseInline(heading[1]!) })
    } else if (bullet) {
      addItem(false, '•', bullet[1]!)
    } else if (ordered) {
      addItem(true, `${ordered[1]}.`, ordered[2]!)
    } else if (list && /^\s/.test(line)) {
      // Dòng thụt lề ngay sau một mục → viết tiếp mục đó.
      const last = list.items[list.items.length - 1]!
      last.text += `\n${line.trim()}`
    } else {
      flushList()
      paragraph.push(line)
    }
  }
  flushParagraph()
  flushList()
  return blocks
}

// Thứ tự quan trọng: `**` phải thử trước `*`. `(?!\*)`: với `***` cuối câu, `**` đóng là 2 dấu sau cùng.
const INLINE = /\[product:([a-z0-9-]{1,160})\]|`([^`\n]+)`|\*\*(.+?)\*\*(?!\*)|__(.+?)__|\[([^\]\n]+)\]\((?:[^)\s]+)\)|\*([^*\s](?:[^*\n]*[^*\s])?)\*|\b_([^_\n]+)_\b/g

export function parseInline(text: string, style: { bold?: boolean; italic?: boolean } = {}): Inline[] {
  const out: Inline[] = []
  const push = (next: Inline) => {
    const prev = out[out.length - 1]
    if (next.type === 'product') {
      out.push(next)
      return
    }
    // Gộp đoạn cùng kiểu cho cây Text gọn hơn.
    if (prev?.type === 'text' && prev.bold === next.bold && prev.italic === next.italic && prev.code === next.code) {
      prev.text += next.text
    } else {
      out.push(next)
    }
  }
  const pushText = (value: string, extra: { code?: boolean } = {}) => {
    if (value) push({ type: 'text', text: value, ...style, ...extra })
  }

  let last = 0
  for (const match of text.matchAll(INLINE)) {
    pushText(text.slice(last, match.index))
    const [, product, code, bold1, bold2, linkLabel, italic1, italic2] = match
    if (product) push({ type: 'product', id: product })
    else if (code) pushText(code, { code: true })
    else if (bold1 ?? bold2) parseInline((bold1 ?? bold2)!, { ...style, bold: true }).forEach(push)
    else if (linkLabel) parseInline(linkLabel, style).forEach(push)
    else if (italic1 ?? italic2) parseInline((italic1 ?? italic2)!, { ...style, italic: true }).forEach(push)
    last = match.index + match[0].length
  }
  pushText(text.slice(last))
  return out
}
