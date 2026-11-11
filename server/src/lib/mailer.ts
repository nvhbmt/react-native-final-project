import nodemailer from 'nodemailer'

export type Mail = { to: string; subject: string; text: string }
export interface Mailer {
  send(mail: Mail): Promise<void>
}

/** Gửi qua SMTP (`SMTP_URL`, vd. `smtps://user:pass@smtp.gmail.com:465`). */
export function createSmtpMailer(url: string, from: string): Mailer {
  const transport = nodemailer.createTransport(url)
  return {
    async send(mail) {
      await transport.sendMail({ from, ...mail })
    },
  }
}

/** Dev: không gửi thật, in nội dung ra console để lấy mã. */
export const consoleMailer: Mailer = {
  async send(mail) {
    console.log(`[mail] → ${mail.to}\n  ${mail.subject}\n  ${mail.text.replace(/\n/g, '\n  ')}`)
  },
}
