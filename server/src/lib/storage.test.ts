import { describe, expect, it } from 'vitest'

import { createSupabaseStorage } from './storage.ts'

const SECRET = 'sb_secret_test_only_value'

function fakeFetch(responses: Response[]) {
  const calls: { url: string; init?: RequestInit }[] = []
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return responses.shift() ?? new Response('{}', { status: 200 })
  }) as typeof fetch
  return { fn, calls }
}

describe('Supabase Storage', () => {
  it('upload đúng endpoint/header, URL public dạng tuyệt đối', async () => {
    const { fn, calls } = fakeFetch([new Response('{"Key":"uploads/a.jpg"}', { status: 200 })])
    const storage = createSupabaseStorage({ url: 'https://ref.supabase.co/', serviceKey: SECRET, bucket: 'uploads', fetch: fn })
    await storage.put('a.jpg', new Uint8Array([1, 2, 3]), 'image/jpeg')

    expect(calls[0]!.url).toBe('https://ref.supabase.co/storage/v1/object/uploads/a.jpg')
    expect(calls[0]!.init).toMatchObject({ method: 'POST', headers: { apikey: SECRET, 'Content-Type': 'image/jpeg', 'x-upsert': 'false' } })
    // Secret key mới không phải JWT → không được gửi qua Authorization.
    expect((calls[0]!.init!.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(storage.publicUrl('a.jpg')).toBe('https://ref.supabase.co/storage/v1/object/public/uploads/a.jpg')
    expect(storage.kind).toBe('supabase')
  })

  it('lỗi upload báo mã trạng thái nhưng không lộ service key', async () => {
    const { fn } = fakeFetch([new Response('{"message":"Bucket not found"}', { status: 404 })])
    const storage = createSupabaseStorage({ url: 'https://ref.supabase.co', serviceKey: SECRET, bucket: 'uploads', fetch: fn })
    const error = await storage.put('a.jpg', new Uint8Array([1]), 'image/jpeg').catch((e: Error) => e)
    expect((error as Error).message).toContain('404')
    expect((error as Error).message).toContain('Bucket not found')
    expect((error as Error).message).not.toContain(SECRET)
  })

  it('ensureBucket: có sẵn thì không tạo; chưa có thì tạo bucket public giới hạn 5MB', async () => {
    const exists = fakeFetch([new Response('{}', { status: 200 })])
    expect(await createSupabaseStorage({ url: 'https://ref.supabase.co', serviceKey: SECRET, bucket: 'uploads', fetch: exists.fn }).ensureBucket()).toBe('exists')
    expect(exists.calls).toHaveLength(1)

    const missing = fakeFetch([new Response('{}', { status: 404 }), new Response('{"name":"uploads"}', { status: 200 })])
    expect(await createSupabaseStorage({ url: 'https://ref.supabase.co', serviceKey: SECRET, bucket: 'uploads', fetch: missing.fn }).ensureBucket()).toBe('created')
    expect(missing.calls[1]!.url).toBe('https://ref.supabase.co/storage/v1/bucket')
    expect(JSON.parse(String(missing.calls[1]!.init!.body))).toMatchObject({ id: 'uploads', public: true, file_size_limit: 5 * 1024 * 1024 })
  })

  it('khoá service_role cũ (JWT) gửi cả apikey lẫn Authorization: Bearer', async () => {
    const { fn, calls } = fakeFetch([new Response('{}', { status: 200 })])
    await createSupabaseStorage({ url: 'https://ref.supabase.co', serviceKey: 'eyJlegacy.jwt.value', bucket: 'uploads', fetch: fn }).put('a.png', new Uint8Array([1]), 'image/png')
    expect(calls[0]!.init!.headers).toMatchObject({ apikey: 'eyJlegacy.jwt.value', Authorization: 'Bearer eyJlegacy.jwt.value' })
  })
})
