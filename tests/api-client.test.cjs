const assert = require('node:assert/strict')
const { beforeEach, test } = require('node:test')

const { ApiError, api, configureApi, configureApiAuth } = require('../src/lib/api/client.ts')

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const expired = () => json(401, { success: false, error: { code: 'TOKEN_EXPIRED', message: 'expired' } })

let calls
function useFetch(handler) {
  calls = []
  configureApi({
    baseUrl: 'http://api.test',
    fetch: async (url, init) => {
      calls.push({ url, init })
      return handler(url, init, calls.length)
    },
  })
}

beforeEach(() => configureApiAuth(undefined))

test('unwraps data and sends JSON body with bearer token', async () => {
  useFetch(() => json(200, { success: true, data: { ok: 1 } }))
  configureApiAuth({ getAccessToken: () => 'abc', refresh: async () => null })
  assert.deepEqual(await api.post('/things', { a: 1 }), { ok: 1 })
  assert.equal(calls[0].url, 'http://api.test/api/v1/things')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer abc')
  assert.equal(calls[0].init.body, '{"a":1}')
})

test('public requests never send a token', async () => {
  useFetch(() => json(200, { success: true, data: null }))
  configureApiAuth({ getAccessToken: () => 'abc', refresh: async () => null })
  await api.post('/auth/login', {}, { auth: false })
  assert.equal(calls[0].init.headers.Authorization, undefined)
})

test('maps error envelope and validation details to ApiError', async () => {
  useFetch(() => json(400, {
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'bad', details: [{ field: 'email', message: 'Email không hợp lệ' }] },
  }))
  await assert.rejects(api.post('/auth/register', {}), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.code, 'VALIDATION_ERROR')
    assert.deepEqual(error.fieldErrors, { email: 'Email không hợp lệ' })
    return true
  })
})

test('network failures become NETWORK_ERROR', async () => {
  useFetch(() => { throw new TypeError('Network request failed') })
  await assert.rejects(api.get('/x'), { code: 'NETWORK_ERROR', status: 0 })
})

test('refreshes once on TOKEN_EXPIRED and retries with the new token', async () => {
  let refreshes = 0
  useFetch((_url, init) => (init.headers.Authorization === 'Bearer new' ? json(200, { success: true, data: 'ok' }) : expired()))
  configureApiAuth({ getAccessToken: () => 'old', refresh: async () => { refreshes++; return 'new' } })
  assert.equal(await api.get('/auth/me'), 'ok')
  assert.equal(refreshes, 1)
  assert.equal(calls.length, 2)
})

test('rethrows the original error when refresh fails, without looping', async () => {
  useFetch(() => expired())
  configureApiAuth({ getAccessToken: () => 'old', refresh: async () => null })
  await assert.rejects(api.get('/auth/me'), { code: 'TOKEN_EXPIRED' })
  assert.equal(calls.length, 1)
})

test('other 401 codes do not trigger refresh', async () => {
  let refreshes = 0
  useFetch(() => json(401, { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'x' } }))
  configureApiAuth({ getAccessToken: () => 'old', refresh: async () => { refreshes++; return 'new' } })
  await assert.rejects(api.get('/x'), { code: 'INVALID_CREDENTIALS' })
  assert.equal(refreshes, 0)
})

const { parseSseChunk, splitProductLinks } = require('../src/features/assistant/lib/sse.ts')

test('parses server-sent events split across network chunks', () => {
  const first = parseSseChunk('event: start\ndata: {"a":1}\n\nevent: delta\ndata: {"text":"Xin')
  assert.deepEqual(first.events, [{ event: 'start', data: '{"a":1}' }])
  const second = parseSseChunk(`${first.rest} chào"}\r\n\r\nevent: done\ndata: {}\n\n`)
  assert.deepEqual(second.events.map((e) => e.event), ['delta', 'done'])
  assert.equal(JSON.parse(second.events[0].data).text, 'Xin chào')
  assert.equal(second.rest, '')
})

test('splits assistant answers into text and product links', () => {
  assert.deepEqual(splitProductLinks('Thử [product:banana] nhé'), [
    { type: 'text', text: 'Thử ' },
    { type: 'product', id: 'banana' },
    { type: 'text', text: ' nhé' },
  ])
  assert.deepEqual(splitProductLinks('[product:Bad Id]'), [{ type: 'text', text: '[product:Bad Id]' }])
})
