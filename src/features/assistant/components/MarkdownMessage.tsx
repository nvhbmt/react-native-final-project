import { Text, View } from '@tamagui/tailwind'
import { router } from 'expo-router'

import { cn } from '@/lib/cn'
import { selectableText } from '@/lib/selectableText'

import { parseMarkdown, type Inline } from '../lib/markdown'

type Props = { content: string }

/** Nội dung tin nhắn: markdown rút gọn (xem lib/markdown) + liên kết sản phẩm. */
export function MarkdownMessage({ content }: Props) {
  const color = 'text-neutral-900'
  const textClass = cn('text-[14px] leading-[22px]', color)

  return (
    <View className="gap-2">
      {parseMarkdown(content).map((block, i) => {
        if (block.type === 'heading') {
          return (
            <Text key={i} {...selectableText} className={cn('text-[15px] leading-[24px] font-bold', color)}>
              <Inlines inlines={block.inlines} />
            </Text>
          )
        }
        if (block.type === 'list') {
          return (
            <View key={i} className="gap-1">
              {block.items.map((item, j) => (
                <View key={j} className="flex-row gap-1.5">
                  <Text className={cn(textClass, block.ordered ? 'min-w-[18px]' : 'w-[10px]')}>{item.marker}</Text>
                  {/* flex-1: chữ có bề rộng xác định, không tự co (Android hay đo hụt → mất chữ cuối). */}
                  <Text {...selectableText} className={cn(textClass, 'flex-1')}>
                    <Inlines inlines={item.inlines} />
                  </Text>
                </View>
              ))}
            </View>
          )
        }
        return (
          <Text key={i} {...selectableText} className={textClass}>
            <Inlines inlines={block.inlines} />
          </Text>
        )
      })}
    </View>
  )
}

function Inlines({ inlines }: { inlines: Inline[] }) {
  return inlines.map((part, i) => {
    if (part.type === 'product') {
      return (
        <Text
          key={i}
          role="link"
          onPress={() => router.push({ pathname: '/product/[id]', params: { id: part.id } })}
          className="font-bold text-primary underline"
        >
          Xem sản phẩm
        </Text>
      )
    }
    if (!part.bold && !part.italic && !part.code) return part.text
    return (
      <Text
        key={i}
        className={cn(part.bold && 'font-bold', part.italic && 'italic', part.code && 'rounded bg-neutral-200 text-[13px]')}
      >
        {part.text}
      </Text>
    )
  })
}
