import { Text, View } from '@tamagui/tailwind'
import type { PropsWithChildren, ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { cn } from '@/lib/cn'

type Props = PropsWithChildren<{
  /** Tiêu đề lớn kiểu tab (Home, Inbox...). Bỏ qua khi đã có `header`. */
  title?: string
  /** Header cố định phía trên vùng cuộn (vd. AppHeader). */
  header?: ReactNode
  /** Thanh cố định dưới đáy (vd. nút "Buy Now"), tự chừa safe area. */
  footer?: ReactNode
  /** Mặc định cuộn được; tắt khi màn hình tự quản lý list (FlatList...) */
  scroll?: boolean
  /** Ghi đè padding/gap của vùng nội dung. */
  contentClassName?: string
  /** Chừa vùng home indicator khi màn không có tab bar/footer (màn trong Stack). */
  safeBottom?: boolean
}>

// Khung chuẩn cho mọi màn hình: safe area, header, nội dung cuộn, footer dính đáy.
export function Screen({
  title,
  header,
  footer,
  scroll = true,
  contentClassName = 'gap-4 px-4 pt-2 pb-6',
  safeBottom = false,
  children,
}: Props) {
  // Tiêu đề tab có lề cố định, tách khỏi padding riêng của từng màn để mọi tab thẳng hàng.
  const content = (
    <>
      {title && !header ? (
        <View className="px-6 pt-2">
          <Text className="font-heading text-[30px] leading-[40px] font-bold text-color">{title}</Text>
        </View>
      ) : null}
      <View className={cn('flex-1', contentClassName)}>{children}</View>
    </>
  )

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={footer || safeBottom ? ['top', 'bottom'] : ['top']} style={{ flex: 1 }}>
        {header}
        {scroll ? (
          // Tránh bàn phím che ô nhập:
          // - iOS: ScrollView tự chừa inset bằng bàn phím và cuộn tới ô đang nhập.
          // - Android edge-to-edge: cửa sổ không tự co (adjustResize vô hiệu) nên chèn padding thủ công;
          //   ScrollView co lại thì Android tự cuộn ô đang focus vào vùng nhìn thấy.
          // Không bật padding trên iOS — sẽ bị đẩy 2 lần cùng automaticallyAdjustKeyboardInsets.
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'android' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets
              // Chạm nút khi bàn phím đang mở vẫn ăn ngay, không cần chạm 2 lần.
              keyboardShouldPersistTaps="handled"
            >
              {content}
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          content
        )}
        {footer}
      </SafeAreaView>
    </View>
  )
}
