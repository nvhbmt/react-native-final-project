import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { commerceTestUrl, startCommerceTest } from '@/test/integration.ts'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe.skipIf(!commerceTestUrl)('góp ý', () => {
  let t: Awaited<ReturnType<typeof startCommerceTest>>
  let dir: string
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'uploads-'))
    t = await startCommerceTest((db) => ({ commerce: { db, allowDemoCheckout: true, uploadDir: dir } }))
  })
  afterAll(async () => {
    await t?.stop()
    await rm(dir, { recursive: true, force: true })
  })

  async function upload(token: string, purpose: string) {
    const form = new FormData()
    form.set('purpose', purpose)
    form.set('file', new Blob([PNG]), 'a.png')
    const res = await t.app.request('/api/v1/uploads', { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } })
    return ((await res.json()) as { data: { id: string; url: string } }).data
  }

  it('lưu góp ý kèm ảnh của chính mình và gửi thư cảm ơn', async () => {
    const { token } = await t.register()
    const image = await upload(token, 'feedback')
    const avatar = await upload(token, 'avatar')
    const body = { mood: 'happy', topics: ['Service', 'Service', 'Delivery'], comment: ' Tốt ', imageIds: [image.id], rating: 5 }
    expect((await t.call('POST', '/feedback', { token, body: { ...body, imageIds: [avatar.id] } })).body.error.code).toBe('INVALID_UPLOAD')
    expect((await t.call('POST', '/feedback', { token, body: { ...body, rating: 0 } })).status).toBe(400)
    expect((await t.call('POST', '/feedback', { token, body: { ...body, orderId: crypto.randomUUID() } })).status).toBe(404)

    const created = await t.call('POST', '/feedback', { token, body })
    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ topics: ['Service', 'Delivery'], comment: 'Tốt', images: [image.url], rating: 5 })
    expect((await t.call('GET', '/feedback', { token })).body.data).toHaveLength(1)
    expect((await t.call('GET', '/inbox', { token })).body.data.items[0].kind).toBe('feedback')
  })
})
