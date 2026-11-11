import type { FeedbackInput, FeedbackPayload } from '../types'

/**
 * Dựng body gửi server từ form (hàm thuần để test). Trả `null` nếu số sao không hợp lệ.
 * Chủ đề trùng bị gộp; productId/orderId rỗng bị bỏ.
 */
export function buildFeedbackPayload(
  form: Omit<FeedbackInput, 'images'>,
  imageIds: string[],
  context: { productId?: string; orderId?: string } = {},
): FeedbackPayload | null {
  if (!Number.isInteger(form.rating) || form.rating < 1 || form.rating > 5) return null
  return {
    mood: form.mood,
    topics: [...new Set(form.topics)],
    comment: form.comment.trim(),
    imageIds: [...imageIds],
    rating: form.rating,
    ...(context.productId ? { productId: context.productId } : {}),
    ...(context.orderId ? { orderId: context.orderId } : {}),
  }
}
