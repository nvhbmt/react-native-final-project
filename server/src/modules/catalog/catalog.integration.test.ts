import { fileURLToPath } from 'node:url'

import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createDb } from '@/db/client.ts'
import { createTestApp } from '@/test/helpers.ts'

import { createCatalogRepository } from './repository.ts'
import { seedCatalog } from './seed.ts'
import { createCatalogService } from './service.ts'

const url = process.env.CATALOG_TEST_DATABASE_URL
if (url && !new URL(url).pathname.endsWith('_catalog_test')) {
  throw new Error('Catalog test cần database có hậu tố _catalog_test')
}

describe.skipIf(!url)('catalog với Postgres', () => {
  let connection: ReturnType<typeof createDb>
  let call: ReturnType<typeof createTestApp>['call']
  const get = (path: string) => call('GET', path)

  beforeAll(async () => {
    connection = createDb(url!)
    await migrate(connection.db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    await seedCatalog(connection.db)
    const catalog = createCatalogService(createCatalogRepository(connection.db))
    call = createTestApp({ catalog }).call
  })
  afterAll(async () => connection?.close())

  it('seed đủ 20 sản phẩm mỗi nhóm, chạy lại không tạo trùng và có dữ liệu Home', async () => {
    expect(await seedCatalog(connection.db)).toEqual({ total: 80, inserted: 0 })
    const { status, body } = await get('/home')
    expect(status).toBe(200)
    const { categories, banners, deals, recommendedProducts } = body.data
    expect(categories.map((category: { id: string }) => category.id))
      .toEqual(['electronics', 'fashion', 'beauty', 'fruits'])
    expect(banners).toHaveLength(4)
    expect(deals.length).toBeGreaterThan(0)
    expect(recommendedProducts.length).toBeGreaterThan(0)
    for (const category of categories) {
      expect(category.image).toMatch(/^https:\/\//)
      const listing = await get(`/products?category=${category.id}&limit=50`)
      expect(listing.status).toBe(200)
      expect(listing.body.data.items).toHaveLength(20)
    }
  })

  it('phân trang ổn định khi trùng điểm xếp hạng và ràng buộc cursor với bộ lọc', async () => {
    const path = '/products?category=electronics&sort=popular&limit=7'
    const allIds = new Set<string>()
    let cursor: string | null = null
    for (const expectedLength of [7, 7, 6]) {
      const page = await get(cursor ? `${path}&cursor=${cursor}` : path)
      expect(page.status).toBe(200)
      expect(page.body.data.items).toHaveLength(expectedLength)
      for (const { id } of page.body.data.items) allIds.add(id)
      cursor = page.body.data.nextCursor
      if (expectedLength === 7) {
        expect(typeof cursor).toBe('string')
        const changed = await get(`/products?category=beauty&sort=popular&cursor=${cursor}`)
        expect(changed.body.error.code).toBe('INVALID_CURSOR')
      }
    }
    expect(cursor).toBeNull()
    expect(allIds.size).toBe(20)
  })

  it('tìm theo từ khóa, giữ ký tự LIKE theo nghĩa đen và kết hợp các bộ lọc', async () => {
    const matches = await get('/products?q=airpods+max&sort=matched&category=electronics&subcategory=headphone')
    expect(matches.body.data.items[0].id).toBe('plug-airpods-max-midnight-usb-c')
    expect((await get('/products?q=%25')).body.data.items).toEqual([])
    expect((await get('/products?category=fruits&minRating=0')).body.data.items).toHaveLength(20)
    const tees = await get('/products?category=fashion&subcategory=t-shirt&benefits%5B%5D=ship-to-store')
    expect(tees.body.data.items).toEqual([expect.objectContaining({ id: 'vuori-strato-tech-tee-black' })])

    const selected = await get('/products?category=electronics&minPrice=50&maxPrice=850&minRating=4.5'
      + '&shipping%5B%5D=instant&shipping%5B%5D=express&benefits%5B%5D=free-return&benefits%5B%5D=best-deal')
    expect(selected.status).toBe(200)
    expect(selected.body.data.items.length).toBeGreaterThan(0)
    for (const item of selected.body.data.items) {
      expect(item.price).toBeGreaterThanOrEqual(50)
      expect(item.price).toBeLessThanOrEqual(850)
      expect(item.rating).toBeGreaterThanOrEqual(4.5)
      expect(item.shippingOptions).toContain('express')
      expect(item.benefits).toEqual(expect.arrayContaining(['free-return', 'best-deal']))
    }
    expect((await get('/products?minPrice=10&maxPrice=9')).status).toBe(400)
    expect((await get('/products?category=beauty&subcategory=laptop')).status).toBe(400)
  })

  it('trả chi tiết có nguồn, sản phẩm liên quan và bảng size thực tế', async () => {
    const id = 'allbirds-mens-cruiser-medium-grey'
    const path = `/products/${id}`
    const detail = await get(path)
    expect(detail.status).toBe(200)
    expect(detail.body.data).toMatchObject({ id, currency: 'USD', priceUnit: 'item', category: 'fashion' })
    expect(detail.body.data.images[0]).toBe(detail.body.data.image)
    expect(detail.body.data.variants.sizes.length).toBeGreaterThan(0)
    expect(detail.body.data.hasVariants).toBe(true)
    expect(detail.body.data.sourceUrl).toBe(`https://www.allbirds.com/products/${id.replace('allbirds-', '')}`)

    const related = await get(`${path}/related?limit=3`)
    expect(related.body.data).toHaveLength(3)
    for (const product of related.body.data) {
      expect(product.id).not.toBe(id)
      expect(product.subcategory).toBe('shoes')
    }
    const relatedListing = await get(`/products?relatedTo=${id}&q=cruiser&limit=3`)
    expect(relatedListing.status).toBe(200)
    expect(relatedListing.body.data.items).toHaveLength(3)
    for (const item of relatedListing.body.data.items) {
      expect(item.id).not.toBe(id)
      expect(item.category).toBe('fashion')
    }

    const chart = await get(`${path}/size-guide`)
    expect(chart.body.data).toEqual(detail.body.data.sizeChart)
    expect(chart.body.data.rows).toEqual(expect.arrayContaining([expect.objectContaining({ size: '8' })]))
    expect((await get('/products/banana/size-guide')).body.data).toBeNull()
    expect((await get('/products/missing-product')).body.error.code).toBe('PRODUCT_NOT_FOUND')
  })
})
