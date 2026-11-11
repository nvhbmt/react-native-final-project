import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { commerceTestUrl, startCommerceTest } from '@/test/integration.ts'
import { sniffImage } from './routes.ts'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])

describe('sniffImage', () => {
  it('nhận diện theo magic bytes', () => {
    expect(sniffImage(PNG)?.mime).toBe('image/png')
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe('jpg')
    expect(sniffImage(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))?.ext).toBe('webp')
    expect(sniffImage(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull()
  })
})

describe.skipIf(!commerceTestUrl)('upload ảnh', () => {
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

  const send = (token: string | undefined, file: Blob, purpose = 'avatar') => {
    const form = new FormData()
    form.set('purpose', purpose)
    form.set('file', file, 'x.png')
    return t.app.request('/api/v1/uploads', { method: 'POST', body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} })
  }

  it('lưu ảnh hợp lệ và phục vụ lại qua /uploads', async () => {
    const { token } = await t.register()
    expect((await send(undefined, new Blob([PNG]))).status).toBe(401)
    const res = await send(token, new Blob([PNG]))
    expect(res.status).toBe(201)
    const { data } = await res.json() as { data: { url: string; mimeType: string } }
    expect(data.mimeType).toBe('image/png')
    const file = await t.app.request(data.url)
    expect(file.status).toBe(200)
    expect(file.headers.get('content-type')).toBe('image/png')
    expect((await t.app.request('/uploads/../../etc/passwd')).status).toBe(404)
  })

  it('nhận ảnh base64 trong JSON (app mobile)', async () => {
    const { token } = await t.register()
    const base64 = Buffer.from(PNG).toString('base64')
    const res = await t.call('POST', '/uploads', { token, body: { purpose: 'feedback', data: `data:image/png;base64,${base64}` } })
    expect(res.status).toBe(201)
    expect(res.body.data.mimeType).toBe('image/png')
    expect((await t.call('POST', '/uploads', { token, body: { purpose: 'feedback', data: Buffer.from('hello').toString('base64') } })).status).toBe(415)
    expect((await t.call('POST', '/uploads', { token, body: { purpose: 'feedback' } })).status).toBe(400)
  })

  it('từ chối file không phải ảnh, purpose sai và file quá lớn', async () => {
    const { token } = await t.register()
    expect((await send(token, new Blob(['<html>']))).status).toBe(415)
    expect((await send(token, new Blob([PNG]), 'other')).status).toBe(400)
    const big = new Uint8Array(5 * 1024 * 1024 + 1)
    big.set(PNG)
    expect((await send(token, new Blob([big]))).status).toBe(413)
  })
})
