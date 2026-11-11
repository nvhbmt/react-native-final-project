/**
 * Kiểm tra cấu hình email và gửi một thư thử.
 *
 *   npm run mail:test                  # chỉ kiểm tra kết nối + đăng nhập SMTP, không gửi thư
 *   npm run mail:test -- ban@gmail.com # gửi thư thử tới địa chỉ này
 *
 * Không in mật khẩu; chỉ in host, tài khoản đăng nhập và người gửi.
 */
import { loadEnv, smtpConfig } from '@/env.ts'
import { createSmtpMailer } from '@/lib/mailer.ts'

const env = loadEnv()
const smtp = smtpConfig(env)
if (!smtp) {
  console.error('Chưa cấu hình email: đặt SMTP_USER + SMTP_PASS (Gmail App Password) hoặc SMTP_URL trong server/.env.')
  process.exit(1)
}

const target = typeof smtp.transport === 'string'
  ? new URL(smtp.transport).host
  : `${smtp.transport.host}:${smtp.transport.port} (đăng nhập ${smtp.transport.auth.user})`
console.log(`SMTP: ${target}\nNgười gửi: ${smtp.from}`)

const mailer = createSmtpMailer(smtp.transport, smtp.from)
try {
  await mailer.verify()
  console.log('✔ Kết nối và đăng nhập SMTP thành công')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`✖ Không đăng nhập được SMTP: ${message.split('\n')[0]}`)
  if (/535|Username and Password not accepted|BadCredentials/i.test(message)) {
    console.error('  → Kiểm tra SMTP_USER là đúng địa chỉ Gmail và SMTP_PASS là App Password 16 ký tự (không phải mật khẩu Gmail).')
  } else if (/534|Application-specific password required/i.test(message)) {
    console.error('  → Tài khoản cần bật Xác minh 2 bước rồi tạo App Password tại https://myaccount.google.com/apppasswords')
  }
  process.exit(1)
}

const to = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
if (to) {
  await mailer.send({
    to,
    subject: 'MobiMart – Thư thử cấu hình email',
    text: 'Nếu bạn nhận được thư này, máy chủ MobiMart đã gửi email thành công.\n\nMobiMart',
    html: '<p>Nếu bạn nhận được thư này, máy chủ <b>MobiMart</b> đã gửi email thành công.</p>',
  })
  console.log(`✔ Đã gửi thư thử tới ${to}`)
}
