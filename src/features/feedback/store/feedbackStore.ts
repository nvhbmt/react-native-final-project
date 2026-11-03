import { create } from 'zustand'

import type { FeedbackInput, SubmittedFeedback } from '../types'

type FeedbackState = {
  entries: SubmittedFeedback[]
  submitFeedback: (input: FeedbackInput & { productId?: string; orderId?: string }) => void
}

let sequence = 0

export const useFeedbackStore = create<FeedbackState>((set) => ({
  entries: [],
  submitFeedback: (input) => {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return
    const entry: SubmittedFeedback = {
      ...input,
      id: `feedback-${Date.now()}-${++sequence}`,
      createdAt: Date.now(),
      topics: [...input.topics],
      images: [...input.images],
    }
    set((state) => ({ entries: [entry, ...state.entries] }))
  },
}))
