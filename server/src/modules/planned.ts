import { Hono } from 'hono'

import { AppError } from '@/lib/http.ts'
import { requireAuth } from '@/middleware/auth.ts'

/**
 * Các endpoint đã chốt hợp đồng (method + path) nhưng chưa triển khai.
 * Mỗi endpoint trả 501 NOT_IMPLEMENTED; endpoint cần đăng nhập vẫn kiểm tra access token trước,
 * để app có thể nối luồng 401 → refresh → thử lại ngay từ bây giờ.
 *
 * Khi triển khai một module: tạo `modules/<module>/routes.ts`, mount trong `app.ts`
 * TRƯỚC router này, rồi xoá các dòng tương ứng ở đây.
 */
export type PlannedEndpoint = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  module: string
  auth: boolean
  summary: string
}

const e = (method: PlannedEndpoint['method'], path: string, module: string, auth: boolean, summary: string): PlannedEndpoint => ({
  method,
  path,
  module,
  auth,
  summary,
})

export const PLANNED_ENDPOINTS: PlannedEndpoint[] = [
  // Auth — phần còn lại cần dịch vụ gửi email
  e('POST', '/auth/forgot-password', 'auth', false, 'Gửi mã/đường dẫn đặt lại mật khẩu qua email'),
  e('POST', '/auth/reset-password', 'auth', false, 'Đặt lại mật khẩu bằng mã đã gửi'),



  // Thanh toán & đơn hàng
  e('GET', '/payment-methods', 'payments', true, 'Phương thức thanh toán đã lưu'),
  e('POST', '/payment-methods', 'payments', true, 'Lưu phương thức thanh toán (token từ cổng thanh toán)'),
  e('DELETE', '/payment-methods/:id', 'payments', true, 'Xoá phương thức thanh toán'),
  e('GET', '/orders', 'orders', true, 'Lịch sử đơn hàng'),
  e('POST', '/orders/:id/cancel', 'orders', true, 'Huỷ đơn khi chưa giao'),
  e('POST', '/orders/:id/pay', 'payments', true, 'Tạo giao dịch thanh toán cho đơn'),
  e('POST', '/payments/webhook', 'payments', false, 'Webhook từ cổng thanh toán (xác thực bằng chữ ký)'),

  // Góp ý
  e('POST', '/feedback', 'feedback', true, 'Gửi góp ý: mood, topics, comment, images, rating, productId?, orderId?'),
  e('GET', '/feedback', 'feedback', true, 'Góp ý đã gửi'),

  // Chat AI — trợ lý mua sắm
  e('GET', '/ai/conversations', 'ai-chat', true, 'Danh sách cuộc hội thoại với trợ lý AI'),
  e('POST', '/ai/conversations', 'ai-chat', true, 'Tạo hội thoại mới (có thể gắn productId/orderId làm ngữ cảnh)'),
  e('GET', '/ai/conversations/:id', 'ai-chat', true, 'Chi tiết hội thoại'),
  e('DELETE', '/ai/conversations/:id', 'ai-chat', true, 'Xoá hội thoại'),
  e('GET', '/ai/conversations/:id/messages', 'ai-chat', true, 'Lịch sử tin nhắn, phân trang ngược'),
  e('POST', '/ai/conversations/:id/messages', 'ai-chat', true, 'Gửi tin nhắn; trả lời stream qua SSE (text/event-stream)'),
  e('POST', '/ai/conversations/:id/messages/:messageId/stop', 'ai-chat', true, 'Dừng câu trả lời đang stream'),
  e('POST', '/ai/messages/:messageId/rating', 'ai-chat', true, 'Đánh giá câu trả lời (hữu ích / không hữu ích)'),
]

export function plannedRoutes(accessSecret: string) {
  const app = new Hono()
  const auth = requireAuth(accessSecret)

  for (const endpoint of PLANNED_ENDPOINTS) {
    const notImplemented = () => {
      throw new AppError(501, 'NOT_IMPLEMENTED', `${endpoint.method} ${endpoint.path} chưa được triển khai`, {
        module: endpoint.module,
        summary: endpoint.summary,
      })
    }
    if (endpoint.auth) app.on(endpoint.method, endpoint.path, auth, notImplemented)
    else app.on(endpoint.method, endpoint.path, notImplemented)
  }
  return app
}
