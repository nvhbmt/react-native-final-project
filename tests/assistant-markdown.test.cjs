const assert = require('node:assert/strict')
const { test } = require('node:test')

const { parseInline, parseMarkdown } = require('../src/features/assistant/lib/markdown.ts')

test('tách liên kết sản phẩm trong câu trả lời', () => {
  assert.deepEqual(parseInline('Thử [product:banana] nhé'), [
    { type: 'text', text: 'Thử ' },
    { type: 'product', id: 'banana' },
    { type: 'text', text: ' nhé' },
  ])
  assert.deepEqual(parseInline('[product:Bad Id]'), [{ type: 'text', text: '[product:Bad Id]' }])
})

test('đậm, nghiêng, code, link markdown', () => {
  assert.deepEqual(parseInline('**iPhone 14** giá *rẻ* `SALE10` [xem](https://x.vn)'), [
    { type: 'text', text: 'iPhone 14', bold: true },
    { type: 'text', text: ' giá ' },
    { type: 'text', text: 'rẻ', italic: true },
    { type: 'text', text: ' ' },
    { type: 'text', text: 'SALE10', code: true },
    { type: 'text', text: ' xem' },
  ])
  assert.deepEqual(parseInline('**đậm *lồng nghiêng***'), [
    { type: 'text', text: 'đậm ', bold: true },
    { type: 'text', text: 'lồng nghiêng', bold: true, italic: true },
  ])
})

test('cú pháp chưa đóng khi đang stream thì giữ nguyên', () => {
  assert.deepEqual(parseInline('**iPhone 14 Midnight'), [{ type: 'text', text: '**iPhone 14 Midnight' }])
  assert.deepEqual(parseInline('2 * 3 = 6'), [{ type: 'text', text: '2 * 3 = 6' }])
  assert.deepEqual(parseInline('ma_san_pham'), [{ type: 'text', text: 'ma_san_pham' }])
})

test('đoạn văn, danh sách, tiêu đề', () => {
  const blocks = parseMarkdown([
    '## Gợi ý',
    'Mình tìm thấy 2 máy:',
    '',
    '- **iPhone 14**: $296.99 [product:iphone-14]',
    '- **iPhone 16e**: $384.99',
    '  còn hàng',
    '',
    '1. Rẻ nhất',
    '2. Mới nhất',
    'Bạn chọn máy nào?',
  ].join('\n'))
  assert.deepEqual(blocks.map((b) => b.type), ['heading', 'paragraph', 'list', 'list', 'paragraph'])
  const bullets = blocks[2]
  assert.equal(bullets.ordered, false)
  assert.deepEqual(bullets.items[0].inlines, [
    { type: 'text', text: 'iPhone 14', bold: true },
    { type: 'text', text: ': $296.99 ' },
    { type: 'product', id: 'iphone-14' },
  ])
  assert.deepEqual(bullets.items[1].inlines.at(-1), { type: 'text', text: ': $384.99\ncòn hàng' })
  assert.deepEqual(blocks[3].items.map((i) => i.marker), ['1.', '2.'])
})
