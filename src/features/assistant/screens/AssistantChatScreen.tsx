import { Ionicons } from '@expo/vector-icons'
import { Text, View } from '@tamagui/tailwind'
import { useLocalSearchParams } from 'expo-router'
import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, type ScrollViewInstance } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppHeader } from '@/components/ui/AppHeader'
import { useRequireAuth } from '@/features/auth'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { appColors, bodyFontFamily } from '@/theme/tamagui.config'

import { MessageBubble } from '../components/MessageBubble'
import { useChat } from '../hooks/useChat'

const SUGGESTIONS = ['Gợi ý điện thoại dưới $800', 'Trái cây nào đang có đánh giá cao?', 'Đơn hàng gần nhất của tôi thế nào?']

export function AssistantChatScreen() {
  useRequireAuth()
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>()
  const chat = useChat(id)
  const [draft, setDraft] = useState('')
  const scroll = useRef<ScrollViewInstance>(null)

  const submit = (text = draft) => {
    if (!text.trim() || chat.streaming) return
    setDraft('')
    void chat.send(text)
  }

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <AppHeader title={title || 'Trợ lý mua sắm'} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scroll}
            contentContainerStyle={{ flexGrow: 1, gap: 12, padding: 16 }}
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          >
            {chat.loading ? <CatalogStatus loading /> : null}
            {chat.hasMore ? (
              <Text role="button" onPress={() => void chat.loadOlder()} className="self-center text-[13px] font-bold text-primary">Tải tin cũ hơn</Text>
            ) : null}
            {!chat.loading && !chat.messages.length ? (
              <View className="flex-1 items-center justify-center gap-3 py-10">
                <Ionicons name="sparkles-outline" size={44} color={appColors.primary} />
                <Text className="text-center text-[14px] leading-[22px] text-neutral-600">Hỏi trợ lý về sản phẩm, so sánh lựa chọn hoặc tình trạng đơn hàng.</Text>
                {SUGGESTIONS.map((s) => (
                  <Text key={s} role="button" onPress={() => submit(s)} className="rounded-full border border-primary px-3 py-1 text-[13px] text-primary">{s}</Text>
                ))}
              </View>
            ) : null}
            {chat.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                activity={chat.streaming?.messageId === message.id ? chat.streaming.activity : null}
                onRate={(rating) => void chat.rate(message, rating)}
              />
            ))}
            {chat.streaming && !chat.streaming.messageId ? <Text className="text-[13px] italic text-neutral-500">{chat.streaming.activity}</Text> : null}
            {chat.error ? <Text role="alert" className="text-[13px] leading-[20px] text-danger">{chat.error}</Text> : null}
          </ScrollView>

          <View className="flex-row items-end gap-2 border-t border-neutral-200 px-4 py-2">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Nhập câu hỏi…"
              placeholderTextColor={appColors['neutral-400']}
              multiline
              submitBehavior="submit"
              returnKeyType="send"
              onSubmitEditing={(event) => submit(event.nativeEvent.text)}
              onKeyPress={(event) => {
                if (Platform.OS !== 'web' || chat.streaming) return
                const key = event.nativeEvent as typeof event.nativeEvent & { shiftKey?: boolean; isComposing?: boolean }
                if (key.key === 'Enter' && !key.shiftKey && !key.isComposing) {
                  event.preventDefault()
                  submit()
                }
              }}
              maxLength={2000}
              accessibilityLabel="Tin nhắn cho trợ lý"
              style={{
                flex: 1, maxHeight: 120, minHeight: 40, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20,
                backgroundColor: appColors['neutral-100'], fontFamily: bodyFontFamily, fontSize: 14, color: appColors['neutral-900'],
              }}
            />
            {chat.streaming ? (
              <View onPress={chat.stop} role="button" aria-label="Dừng trả lời" className="size-[40px] items-center justify-center rounded-full bg-neutral-700 active:opacity-70">
                <Ionicons name="stop" size={16} color="#ffffff" />
              </View>
            ) : (
              <View
                onPress={() => submit()}
                role="button"
                aria-label="Gửi"
                aria-disabled={!draft.trim()}
                className="size-[40px] items-center justify-center rounded-full bg-primary active:opacity-70"
                style={{ opacity: draft.trim() ? 1 : 0.4 }}
              >
                <Ionicons name="send" size={16} color="#ffffff" />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
