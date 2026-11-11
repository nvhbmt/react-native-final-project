import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { commerceTestUrl, startCommerceTest } from '@/test/integration.ts'
import { notify } from './notify.ts'

describe.skipIf(!commerceTestUrl)('hộp thư', () => {
  let t: Awaited<ReturnType<typeof startCommerceTest>>
  beforeAll(async () => { t = await startCommerceTest() })
  afterAll(async () => { await t?.stop() })

  it('phân trang, đếm chưa đọc, đánh dấu đã đọc chỉ trong hộp thư của mình', async () => {
    const me = await t.register()
    const other = await t.register()
    for (let i = 1; i <= 3; i++) await notify(t.db, me.id, { kind: 'system', title: `Tin ${i}`, body: 'Nội dung' })
    expect((await t.call('GET', '/inbox/unread-count', { token: me.token })).body.data.unreadCount).toBe(3)

    const first = (await t.call('GET', '/inbox?limit=2', { token: me.token })).body.data
    expect(first.items.map((m: { title: string }) => m.title)).toEqual(['Tin 3', 'Tin 2'])
    const second = (await t.call('GET', `/inbox?limit=2&cursor=${first.nextCursor}`, { token: me.token })).body.data
    expect(second.items.map((m: { title: string }) => m.title)).toEqual(['Tin 1'])
    expect(second.nextCursor).toBeNull()

    expect((await t.call('POST', `/inbox/${first.items[0].id}/read`, { token: other.token })).status).toBe(404)
    expect((await t.call('POST', `/inbox/${first.items[0].id}/read`, { token: me.token })).body.data.unreadCount).toBe(2)
    expect((await t.call('GET', '/inbox?unread=1', { token: me.token })).body.data.items).toHaveLength(2)
    expect((await t.call('POST', '/inbox/read-all', { token: me.token })).body.data.unreadCount).toBe(0)
    expect((await t.call('GET', '/inbox', { token: other.token })).body.data.items).toEqual([])
  })
})
