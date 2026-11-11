import nodemailer from 'nodemailer'

/** `text` luôn có (ứng dụng mail không hiển thị HTML vẫn đọc được); `html` tuỳ chọn. */
export type Mail = { to: string; subject: string; text: string; html?: string }
export interface Mailer {
  send(mail: Mail): Promise<void>
}

/** URL SMTP (vd. `smtp://localhost:1025`) hoặc host/port/auth (vd. Gmail App Password). */
export type SmtpTransport = string | { host: string; port: number; secure: boolean; auth: { user: string; pass: string } }

/** Gửi qua SMTP. `verify()` kiểm tra kết nối + đăng nhập mà không gửi thư. */
export function createSmtpMailer(options: SmtpTransport, from: string): Mailer & { verify(): Promise<true> } {
  const transport = nodemailer.createTransport(options)
  return {
    async send(mail) {
      await transport.sendMail({ from, ...mail })
    },
    verify: () => transport.verify(),
  }
}

/** Dev: không gửi thật, in nội dung ra console để lấy mã. */
export const consoleMailer: Mailer = {
  async send(mail) {
    console.log(`[mail] → ${mail.to}\n  ${mail.subject}\n  ${mail.text.replace(/\n/g, '\n  ')}`)
  },
}
