/** Escape dữ liệu người dùng (vd. họ tên) trước khi ghép vào HTML email. */
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)

/** Email HTML gửi mã đặt lại mật khẩu — style inline vì nhiều ứng dụng mail bỏ thẻ <style>. */
export function resetCodeEmailHtml(fullName: string, code: string) {
  return `<!doctype html>
<html lang="vi">
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#171a1f">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden">
    <tr><td style="background:#00bdd6;padding:20px 24px;color:#ffffff;font-size:22px;font-weight:bold">MobiMart</td></tr>
    <tr><td style="padding:24px">
      <p style="margin:0 0 12px;font-size:15px">Xin chào ${escapeHtml(fullName)},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:22px">Dùng mã dưới đây để đặt lại mật khẩu tài khoản MobiMart của bạn:</p>
      <p style="margin:0 0 16px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#00bdd6">${code}</p>
      <p style="margin:0;font-size:13px;line-height:20px;color:#565e6c">Mã có hiệu lực trong 15 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
    </td></tr>
  </table>
</body>
</html>`
}
