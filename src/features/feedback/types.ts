export type Mood = 'sad' | 'neutral' | 'happy'

export type FeedbackTopic = 'Service' | 'Quantity' | 'Payment' | 'Delivery' | 'Promotion' | 'Gift'

export type FeedbackInput = {
  mood: Mood | null
  topics: FeedbackTopic[]
  comment: string
  images: string[]
  rating: number
}
