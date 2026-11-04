const assert = require('node:assert/strict')
const { beforeEach, test } = require('node:test')

const { computeTotals, useCartStore } = require('../src/features/cart/store/cartStore.ts')
const { useOrderStore } = require('../src/features/checkout/store/orderStore.ts')
const { useFeedbackStore } = require('../src/features/feedback/store/feedbackStore.ts')

const hoodie = { productId: 'hoodie-shirt', name: 'Hoodie shirt', subtitle: 'Blue · L', image: 1, price: 2.99, options: { color: 'blue', size: 'L' } }

beforeEach(() => {
  useCartStore.getState().clear()
  useOrderStore.setState({ lastOrder: null })
  useFeedbackStore.setState({ entries: [] })
})

test('cart starts empty and combines matching variants while keeping sizes separate', () => {
  const cart = useCartStore.getState()
  assert.deepEqual(cart.items, [])
  cart.addItem({ ...hoodie, quantity: 2 })
  cart.addItem(hoodie)
  cart.addItem({ ...hoodie, options: { color: 'blue', size: 'M' } })
  assert.deepEqual(useCartStore.getState().items.map(({ quantity, options }) => [quantity, options.size]), [[3, 'L'], [1, 'M']])
})

test('editing and removing a cart line updates the shared quantities', () => {
  useCartStore.getState().addItem(hoodie)
  const key = useCartStore.getState().items[0].key
  useCartStore.getState().setQuantity(key, 3)
  assert.equal(useCartStore.getState().items[0].quantity, 3)
  useCartStore.getState().setQuantity(key, 0)
  assert.equal(useCartStore.getState().items.length, 0)
})

test('invalid quantities cannot produce fractional or negative cart counts', () => {
  for (const quantity of [0, -1, 1.5, NaN]) useCartStore.getState().addItem({ ...hoodie, quantity })
  assert.equal(useCartStore.getState().items.length, 0)
  useCartStore.getState().addItem(hoodie)
  useCartStore.getState().setQuantity(useCartStore.getState().items[0].key, NaN)
  assert.equal(useCartStore.getState().items[0].quantity, 1)
})

test('voucher discount, tax and the payment total use rounded monetary amounts', () => {
  useCartStore.getState().addItem({ ...hoodie, quantity: 3 })
  assert.equal(useCartStore.getState().applyVoucher(' sale10 '), true)
  const cart = useCartStore.getState()
  assert.deepEqual(computeTotals(cart.items, cart.voucher.rate), { subtotal: 8.97, discount: 0.9, tax: 0.81, fees: 0, total: 8.88 })
  assert.equal(useCartStore.getState().applyVoucher('unknown'), false)
  assert.equal(useCartStore.getState().voucher.code, 'SALE10')
})

test('order keeps the purchased items and totals after checkout clears the cart', () => {
  useCartStore.getState().addItem({ ...hoodie, quantity: 2 })
  useCartStore.getState().applyVoucher('SALE10')
  const cart = useCartStore.getState()
  const totals = computeTotals(cart.items, cart.voucher.rate)
  const order = useOrderStore.getState().placeOrder(cart.items, totals, { id: 'visa', brand: 'visa', label: '2334' })
  cart.clear()
  assert.equal(useCartStore.getState().items.length, 0)
  assert.equal(useCartStore.getState().voucher, null)
  assert.equal(order.items[0].productId, 'hoodie-shirt')
  assert.equal(order.items[0].quantity, 2)
  assert.equal(order.total, totals.total)
  assert.equal(useOrderStore.getState().lastOrder.id, order.id)
  cart.items[0].options.size = 'XS'
  assert.equal(order.items[0].options.size, 'L')
})

test('submitted feedback preserves product/order context and copies the form payload', () => {
  const input = { mood: 'happy', topics: ['Delivery'], images: ['file:///photo.png'], comment: 'Good product', rating: 4, productId: 'hoodie-shirt', orderId: 'order-1' }
  useFeedbackStore.getState().submitFeedback(input)
  input.topics.push('Service')
  input.images.length = 0
  const entry = useFeedbackStore.getState().entries[0]
  assert.equal(entry.productId, 'hoodie-shirt')
  assert.equal(entry.orderId, 'order-1')
  assert.deepEqual(entry.topics, ['Delivery'])
  assert.deepEqual(entry.images, ['file:///photo.png'])
})

test('feedback requires a rating from one to five', () => {
  for (const rating of [0, 6, NaN, 2.5]) {
    useFeedbackStore.getState().submitFeedback({ mood: null, topics: [], images: [], comment: '', rating })
  }
  assert.deepEqual(useFeedbackStore.getState().entries, [])
})
