import { fileURLToPath } from 'node:url'

import { migrate } from 'drizzle-orm/postgres-js/migrator'

import { createDb } from './client.ts'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Thiếu DATABASE_URL')

const { db, close } = createDb(databaseUrl)
const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url))

await migrate(db, { migrationsFolder })
await close()
console.log('Đã chạy xong migration')
