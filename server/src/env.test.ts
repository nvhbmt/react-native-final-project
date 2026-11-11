import { describe, expect, it } from 'vitest'

import { allowDemoCheckout, loadEnv, smtpConfig, storageConfig } from './env.ts'

const source = {
  DATABASE_URL: 'postgres://market:market@localhost:5435/market_test',
  JWT_ACCESS_SECRET: 'test-only-secret-longer-than-thirty-two-characters',
  SEPAY_WEBHOOK_API_KEY: 'test-only-key',
  SEPAY_BANK: 'MBBank',
  SEPAY_ACCOUNT_NUMBER: '0000000000',
  SEPAY_ACCOUNT_NAME: 'TAI KHOAN GIA LAP',
}

describe('SePay environment safety', () => {
  it('không cho tắt cảnh báo giả lập khi số tài khoản vẫn là số 0', () => {
    expect(() => loadEnv({ ...source, SEPAY_SIMULATED: 'false' })).toThrow('SEPAY_ACCOUNT_NUMBER vẫn là tài khoản giả')
    expect(loadEnv({ ...source, SEPAY_SIMULATED: 'true' }).SEPAY_SIMULATED).toBe(true)
  })
})

describe('AI environment', () => {
  const base = {
    DATABASE_URL: 'postgres://market:market@localhost:5435/market_test',
    JWT_ACCESS_SECRET: 'test-only-secret-longer-than-thirty-two-characters',
  }

  it('Claude dùng native API không cần AI_BASE_URL', () => {
    expect(loadEnv({ ...base, AI_PROVIDER: 'anthropic', AI_API_KEY: 'test-key', AI_MODEL: 'claude-haiku-5-5' }))
      .toMatchObject({ AI_PROVIDER: 'anthropic', AI_MODEL: 'claude-haiku-5-5' })
  })

  it('chặn cấu hình AI thiếu key, model hoặc base URL của Chat Completions', () => {
    expect(() => loadEnv({ ...base, AI_PROVIDER: 'anthropic', AI_MODEL: 'claude-haiku-5-5' })).toThrow('AI_API_KEY')
    expect(() => loadEnv({ ...base, AI_PROVIDER: 'anthropic', AI_API_KEY: 'test-key' })).toThrow('AI_MODEL')
    expect(() => loadEnv({ ...base, AI_API_KEY: 'test-key', AI_MODEL: 'gpt-test' })).toThrow('AI_BASE_URL')
  })
})

describe('Email environment', () => {
  const base = {
    DATABASE_URL: 'postgres://market:market@localhost:5435/market_test',
    JWT_ACCESS_SECRET: 'test-only-secret-longer-than-thirty-two-characters',
  }

  it('Gmail App Password: mặc định smtp.gmail.com:465, bỏ dấu cách, người gửi theo tài khoản', () => {
    const smtp = smtpConfig(loadEnv({ ...base, SMTP_USER: 'shop@gmail.com', SMTP_PASS: 'abcd efgh ijkl mnop' }))
    expect(smtp).toEqual({
      transport: { host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: 'shop@gmail.com', pass: 'abcdefghijklmnop' } },
      from: 'MobiMart <shop@gmail.com>',
    })
  })

  it('SMTP_URL vẫn dùng được; thiếu một nửa hoặc đặt cả hai cách thì báo lỗi', () => {
    expect(smtpConfig(loadEnv({ ...base, SMTP_URL: 'smtp://localhost:1025' }))).toEqual({ transport: 'smtp://localhost:1025', from: 'MobiMart <no-reply@mobimart.local>' })
    expect(smtpConfig(loadEnv(base))).toBeUndefined()
    expect(() => loadEnv({ ...base, SMTP_USER: 'shop@gmail.com' })).toThrow('SMTP_PASS')
    expect(() => loadEnv({ ...base, SMTP_URL: 'smtp://localhost:1025', SMTP_USER: 'a@gmail.com', SMTP_PASS: 'x' })).toThrow('Chỉ chọn một cách')
  })
})

describe('Storage environment', () => {
  const base = {
    DATABASE_URL: 'postgres://market:market@localhost:5435/market_test',
    JWT_ACCESS_SECRET: 'test-only-secret-longer-than-thirty-two-characters',
  }
  it('dòng trống = lưu ổ đĩa; đủ cặp = Supabase; thiếu một nửa thì báo lỗi', () => {
    expect(storageConfig(loadEnv({ ...base, SUPABASE_URL: '', SUPABASE_SECRET_KEY: '' }))).toBeUndefined()
    expect(storageConfig(loadEnv({ ...base, SUPABASE_URL: 'https://ref.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_k' })))
      .toEqual({ url: 'https://ref.supabase.co', serviceKey: 'sb_secret_k', bucket: 'uploads' })
    // Tên biến cũ (khoá service_role JWT) vẫn được nhận.
    expect(storageConfig(loadEnv({ ...base, SUPABASE_URL: 'https://ref.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'eyJlegacy' }))?.serviceKey).toBe('eyJlegacy')
    expect(() => loadEnv({ ...base, SUPABASE_URL: 'https://ref.supabase.co' })).toThrow('SUPABASE_SECRET_KEY')
  })
})

describe('Demo checkout', () => {
  const base = {
    DATABASE_URL: 'postgres://market:market@localhost:5435/market_test',
    JWT_ACCESS_SECRET: 'test-only-secret-longer-than-thirty-two-characters',
  }
  it('mặc định tắt ở production, bật được tường minh cho bản demo online', () => {
    expect(allowDemoCheckout(loadEnv({ ...base, NODE_ENV: 'development' }))).toBe(true)
    expect(allowDemoCheckout(loadEnv({ ...base, NODE_ENV: 'production' }))).toBe(false)
    expect(allowDemoCheckout(loadEnv({ ...base, NODE_ENV: 'production', ALLOW_DEMO_CHECKOUT: 'true' }))).toBe(true)
    expect(allowDemoCheckout(loadEnv({ ...base, NODE_ENV: 'development', ALLOW_DEMO_CHECKOUT: 'false' }))).toBe(false)
  })
})
