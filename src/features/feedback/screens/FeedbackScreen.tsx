import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Animated, KeyboardAvoidingView, Platform, ScrollView, TextInput, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { StarRating } from '@/components/ui/StarRating'
import { appColors, bodyFontFamily } from '@/theme/tamagui.config'

import { ImageUploader } from '../components/ImageUploader'
import { MoodPicker } from '../components/MoodPicker'
import { TopicChips } from '../components/TopicChips'
import { useFeedbackStore } from '../store/feedbackStore'
import type { FeedbackInput } from '../types'

const SHEET_TOP = 89

function Label({ children }: { children: string }) {
  return <Text className="text-[14px] leading-[22px] font-bold text-neutral-700">{children}</Text>
}

/** Bottom sheet góp ý, mở dạng modal trong suốt phủ lên màn trước. */
export function FeedbackScreen() {
  const params = useLocalSearchParams<{ rating?: string; productId?: string; orderId?: string }>()
  const { height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [translateY] = useState(() => new Animated.Value(height))
  const [form, setForm] = useState<FeedbackInput>({
    mood: null,
    topics: [],
    comment: '',
    images: [],
    rating: Math.max(0, Math.min(5, Math.round(Number(params.rating) || 0))),
  })
  const update = (patch: Partial<FeedbackInput>) => setForm((f) => ({ ...f, ...patch }))
  const submitFeedback = useFeedbackStore((state) => state.submitFeedback)

  useEffect(() => {
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 14 }).start()
  }, [translateY])

  // Chặn gọi lại: chạm nền rồi bấm X (hoặc bấm Submit 2 lần) sẽ gọi router.back() 2 lần và pop luôn màn bên dưới.
  const closingRef = useRef(false)
  const close = () => {
    if (closingRef.current) return
    closingRef.current = true
    Animated.timing(translateY, { toValue: height, duration: 200, useNativeDriver: true }).start(() => router.back())
  }

  const submit = () => {
    if (closingRef.current || !form.rating) return
    submitFeedback({ ...form, productId: params.productId, orderId: params.orderId })
    close()
  }

  return (
    <View className="flex-1 bg-[rgba(23,26,31,0.45)]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Vùng trống phía trên sheet: chạm để đóng */}
        <View onPress={close} aria-label="Đóng" style={{ height: Math.max(SHEET_TOP, insets.top + 40) }} />
        <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
          <View className="flex-1 overflow-hidden rounded-t-[6px] bg-white">
            <View className="h-[60px] flex-row items-center justify-center border-b border-neutral-300">
              <Text className="font-heading text-[18px] leading-[28px] font-bold text-neutral-900">Feedback</Text>
              <View
                onPress={close}
                role="button"
                aria-label="Đóng"
                hitSlop={10}
                className="absolute right-4 active:opacity-60"
              >
                <Ionicons name="close" size={24} color={appColors['neutral-500']} />
              </View>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <MoodPicker value={form.mood} onChange={(mood) => update({ mood })} />
              <View className="pt-5">
                <TopicChips value={form.topics} onChange={(topics) => update({ topics })} />
              </View>

              <View className="gap-1.5 pt-7">
                <Label>Care to share more?</Label>
                <TextInput
                  value={form.comment}
                  onChangeText={(comment) => update({ comment })}
                  placeholder="Type your feedbacks"
                  placeholderTextColor={appColors['neutral-400']}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel="Nội dung góp ý"
                  style={{
                    height: 78,
                    paddingHorizontal: 12,
                    paddingTop: 8,
                    borderRadius: 4,
                    backgroundColor: appColors['neutral-200'],
                    fontFamily: bodyFontFamily,
                    fontSize: 14,
                    color: appColors['neutral-900'],
                  }}
                />
              </View>

              <View className="gap-1.5 pt-5">
                <Label>Upload images</Label>
                <ImageUploader value={form.images} onChange={(images) => update({ images })} />
              </View>

              <View className="gap-3 pt-5">
                <Label>Rating</Label>
                <StarRating
                  value={form.rating}
                  size={40}
                  className="justify-around px-3"
                  onChange={(rating) => update({ rating })}
                />
              </View>

              <Button title="Submit" className="mt-7" onPress={submit} disabled={!form.rating} />
            </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  )
}
