const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const ts = require('typescript')

// Resolve app TypeScript modules without installing a separate test runner.
const previousLoader = require.extensions['.ts']
require.extensions['.ts'] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  module._compile(source, filename)
}
const { filterProducts } = require('../src/features/products/lib/filterProducts.ts')
const { emptyFilters } = require('../src/features/products/types.ts')
const { cleanPrice, normalizePriceRange } = require('../src/features/filters/lib/priceRange.ts')
require.extensions['.ts'] = previousLoader

const items = [
  { id: 'phone', name: 'Smartphone', keywords: 'white phone', category: 'electronics', price: 899, rating: 4, sales: 30, image: 1 },
  { id: 'phone-purple', name: 'Smartphone', keywords: 'purple phone', category: 'electronics', price: 789, rating: 4.5, sales: 20, image: 1 },
  { id: 'pear', name: 'Pear', category: 'fruits', price: 3, rating: 4, sales: 40, image: 1 },
  { id: 'cherry', name: 'Cherry', category: 'fruits', price: 10, rating: 5, sales: 10, image: 1 },
]
const ids = (result) => result.map((item) => item.id)

test('search normalizes case and whitespace, includes product keywords and preserves input order', () => {
  assert.deepEqual(ids(filterProducts(items, ' PURPLE ', emptyFilters)), ['phone-purple'])
  assert.deepEqual(ids(filterProducts(items, 'missing', emptyFilters)), [])
  assert.deepEqual(ids(items), ['phone', 'phone-purple', 'pear', 'cherry'])
})

test('price bounds and minimum review rating are inclusive', () => {
  assert.deepEqual(ids(filterProducts(items, '', { ...emptyFilters, minimumPrice: '10', maximumPrice: '789', minimumRating: 4.5 })), ['phone-purple', 'cherry'])
  assert.deepEqual(ids(filterProducts(items, '', { ...emptyFilters, minimumPrice: '900', maximumPrice: '700' })), [])
})

test('shipping options match any selected delivery method', () => {
  assert.deepEqual(ids(filterProducts(items, '', { ...emptyFilters, shippingOptions: ['instant'] })), ['pear', 'cherry'])
  assert.equal(filterProducts(items, '', { ...emptyFilters, shippingOptions: ['instant', 'express'] }).length, 4)
})

test('Others requires every selected shop benefit', () => {
  assert.deepEqual(ids(filterProducts(items, '', { ...emptyFilters, others: ['free-return', 'best-deal'] })), ['phone-purple'])
  assert.deepEqual(ids(filterProducts(items, '', { ...emptyFilters, others: ['ship-to-store'] })), ['phone', 'phone-purple'])
})

test('explicit product policies override the mock category defaults', () => {
  const custom = [{ ...items[0], shippingOptions: ['standard'], benefits: [] }]
  assert.equal(filterProducts(custom, '', { ...emptyFilters, shippingOptions: ['express'] }).length, 0)
  assert.equal(filterProducts(custom, '', { ...emptyFilters, others: ['buyer-protection'] }).length, 0)
})

test('sort order respects popularity and sales without changing the catalog', () => {
  assert.deepEqual(ids(filterProducts(items, '', emptyFilters, 'popular')), ['cherry', 'phone-purple', 'pear', 'phone'])
  assert.deepEqual(ids(filterProducts(items, '', emptyFilters, 'sales')), ['pear', 'phone', 'phone-purple', 'cherry'])
})

test('price entry accepts decimal separators and strips pasted non-price characters', () => {
  assert.equal(cleanPrice('$8.509'), '8.50')
  assert.equal(cleanPrice('8,50'), '8.50')
  assert.equal(cleanPrice(''), '')
})

test('reversed price bounds are ordered rather than discarding the entered range', () => {
  assert.deepEqual(normalizePriceRange('900', '700'), { minimumPrice: '700', maximumPrice: '900' })
  assert.deepEqual(normalizePriceRange('10.50', '900'), { minimumPrice: '10.5', maximumPrice: '900' })
})

test('cleared price fields stay unlimited and large values stay within slider bounds', () => {
  assert.deepEqual(normalizePriceRange('', ''), { minimumPrice: '', maximumPrice: '' })
  assert.deepEqual(normalizePriceRange('99999', ''), { minimumPrice: '10000', maximumPrice: '' })
  assert.deepEqual(normalizePriceRange('', '99999'), { minimumPrice: '', maximumPrice: '10000' })
})
