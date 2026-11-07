import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

// Băm mật khẩu bằng scrypt có sẵn trong Node — không cần native addon (bcrypt/argon2),
// nên cài đặt và deploy không phụ thuộc toolchain C++.
// Định dạng lưu: scrypt$<N>$<r>$<p>$<salt base64url>$<hash base64url>
const PARAMS = { N: 2 ** 15, r: 8, p: 1 }
const KEY_LENGTH = 64
const SALT_LENGTH = 16

function derive(password: string, salt: Buffer, params: typeof PARAMS): Promise<Buffer> {
  const options: ScryptOptions = { ...params, maxmem: 128 * params.N * params.r * 2 }
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const key = await derive(password, salt, PARAMS)
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64url'), key.toString('base64url')].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltText, hashText] = stored.split('$')
  if (scheme !== 'scrypt' || !n || !r || !p || !saltText || !hashText) return false

  const expected = Buffer.from(hashText, 'base64url')
  const actual = await derive(password, Buffer.from(saltText, 'base64url'), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

/** Hash giả để so sánh khi email không tồn tại — giữ thời gian phản hồi tương đương, tránh dò email. */
let dummyHash: Promise<string> | undefined
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'))
  return dummyHash
}
