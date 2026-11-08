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
const { listingPath } = require('../src/features/products/api/listingPath.ts')
const { emptyFilters } = require('../src/features/products/types.ts')
const { cleanPrice, normalizePriceRange } = require('../src/features/filters/lib/priceRange.ts')
require.extensions['.ts'] = previousLoader

test('listing sends catalog query fields and repeated policy parameters accepted by the API', () => {
  const path = listingPath({
    category: 'electronics', subcategory: 'phone', query: ' White & Blue ', sort: 'popular',
    relatedTo: 'iphone-15', limit: 10,
    filters: { minimumPrice: '0', maximumPrice: '899.99', minimumRating: 4.5, shippingOptions: ['instant', 'express'], others: ['free-return', 'best-deal'] },
  })
  const url = new URL(path, 'http://localhost')
  assert.equal(url.pathname, '/products')
  assert.deepEqual(Object.fromEntries([...url.searchParams].filter(([key]) => !key.endsWith('[]'))), {
    q: 'White & Blue', category: 'electronics', subcategory: 'phone', sort: 'popular', relatedTo: 'iphone-15',
    limit: '10', minPrice: '0', maxPrice: '899.99', minRating: '4.5',
  })
  assert.deepEqual(url.searchParams.getAll('shipping[]'), ['instant', 'express'])
  assert.deepEqual(url.searchParams.getAll('benefits[]'), ['free-return', 'best-deal'])
})

test('listing skips filters and subcategory when none are applicable', () => {
  assert.equal(listingPath({ filters: emptyFilters, query: '   ', subcategory: 'phone' }), '/products')
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
