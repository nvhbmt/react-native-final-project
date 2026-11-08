import { seedCatalog } from '@/modules/catalog/seed.ts'

import { createDb } from './client.ts'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Thiếu DATABASE_URL')

const { db, close } = createDb(databaseUrl)
try {
  const { total, inserted } = await seedCatalog(db)
  console.log(`Catalog: ${inserted} sản phẩm mới trên ${total} bản ghi seed`)
} finally {
  await close()
}
