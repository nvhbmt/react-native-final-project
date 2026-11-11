import { spawnSync } from 'node:child_process'

const commands = {
  migrate: 'src/db/migrate.ts',
  'seed-catalog': 'src/db/seedCatalog.ts',
}

const command = process.argv[2]
if (!(command in commands) && command !== 'verify') {
  console.error('Dùng: node --env-file=.env.supabase.local scripts/supabase-local.mjs migrate|seed-catalog|verify')
  process.exit(2)
}

const template = process.env.DATABASE_URL
const password = process.env.PGPASSWORD
if (!template || !password) {
  console.error('Thiếu DATABASE_URL hoặc PGPASSWORD trong .env.supabase.local')
  process.exit(2)
}

const url = new URL(template)
if (!url.hostname.endsWith('.pooler.supabase.com') || url.port !== '5432' || url.password) {
  console.error('DATABASE_URL cần là session pooler Supabase cổng 5432, chưa chứa mật khẩu')
  process.exit(2)
}
url.password = password

const env = { ...process.env, DATABASE_URL: url.toString() }
delete env.PGPASSWORD

// Không để lỗi từ thư viện in vô tình làm lộ mật khẩu hoặc URL có mật khẩu.
const redact = (value = '') => value
  .replaceAll(password, '[REDACTED]')
  .replaceAll(encodeURIComponent(password), '[REDACTED]')
  .replaceAll(url.toString(), '[REDACTED_DATABASE_URL]')

if (command === 'verify') {
  const { default: postgres } = await import('postgres')
  const sql = postgres(url.toString(), { max: 1 })
  try {
    const [catalog] = await sql`select count(*)::int as count from public.catalog_products`
    const tables = await sql`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name in ('orders', 'payment_transactions')
    `
    const names = new Set(tables.map((row) => row.table_name))
    if (!names.has('orders') || !names.has('payment_transactions')) throw new Error('Thiếu bảng đơn hàng hoặc giao dịch')
    console.log(`Supabase: ${catalog.count} sản phẩm; bảng orders và payment_transactions đã có`)
  } catch (error) {
    console.error(redact(String(error)))
    process.exitCode = 1
  } finally {
    await sql.end()
  }
  process.exit()
}

const result = spawnSync(process.execPath, ['--import', 'tsx', commands[command]], {
  env,
  encoding: 'utf8',
  timeout: 120_000,
})

process.stdout.write(redact(result.stdout))
process.stderr.write(redact(result.stderr))
if (result.error) console.error(`Không chạy được ${command}: ${result.error.code ?? result.error.name}`)
process.exit(result.status ?? 1)
