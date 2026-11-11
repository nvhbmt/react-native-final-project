import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { commerceTestUrl, startCommerceTest } from '@/test/integration.ts'

describe.skipIf(!commerceTestUrl)('sản phẩm yêu thích', () => {
  let t: Awaited<ReturnType<typeof startCommerceTest>>
  beforeAll(async () => { t = await startCommerceTest() })
  afterAll(async () => { await t?.stop() })

  it('thêm idempotent, liệt kê mới nhất trước, bỏ yêu thích', async () => {
    const { token } = await t.register()
    expect((await t.call('GET', '/favorites')).status).toBe(401)
    expect((await t.call('PUT', '/favorites/banana', { token })).status).toBe(200)
    expect((await t.call('PUT', '/favorites/banana', { token })).status).toBe(200)
    await t.call('PUT', '/favorites/pear', { token })
    expect((await t.call('PUT', '/favorites/nope', { token })).status).toBe(404)

    const list = (await t.call('GET', '/favorites', { token })).body.data
    expect(list.ids).toEqual(['pear', 'banana'])
    expect(list.items[0]).toMatchObject({ id: 'pear', currency: 'USD' })

    await t.call('DELETE', '/favorites/pear', { token })
    expect((await t.call('GET', '/favorites', { token })).body.data.ids).toEqual(['banana'])
    const other = await t.register()
    expect((await t.call('GET', '/favorites', { token: other.token })).body.data.ids).toEqual([])
  })
})
