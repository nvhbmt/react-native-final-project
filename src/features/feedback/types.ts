import type { PickedImage } from '@/lib/api/media'

export type Mood = 'sad' | 'neutral' | 'happy'

export type FeedbackTopic = 'Service' | 'Quantity' | 'Payment' | 'Delivery' | 'Promotion' | 'Gift'

export type FeedbackInput = {
  mood: Mood | null
  topics: FeedbackTopic[]
  comment: string
  /** Ảnh đã chọn trên máy; upload lúc gửi. */
  images: PickedImage[]
  rating: number
}

/** Body gửi `POST /feedback`. */
export type FeedbackPayload = {
  mood: Mood | null
  topics: FeedbackTopic[]
  comment: string
  imageIds: string[]
  rating: number
  productId?: string
  orderId?: string
}
