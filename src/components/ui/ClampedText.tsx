import { Text } from '@tamagui/tailwind'
import type { ComponentProps } from 'react'
import { Platform } from 'react-native'

type Props = ComponentProps<typeof Text> & {
  /** Số dòng tối đa; bỏ trống = không giới hạn. */
  lines?: number
}

/**
 * Text cắt bớt sau `lines` dòng kèm "…".
 * `Text` của @tamagui/tailwind bỏ qua `numberOfLines`/`line-clamp-*` trên web, nên web dùng CSS line-clamp.
 */
export function ClampedText({ lines, style, ...props }: Props) {
  if (!lines) return <Text style={style} {...props} />

  if (Platform.OS === 'web') {
    const clamp = {
      display: '-webkit-box',
      WebkitLineClamp: lines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    } as const
    return <Text style={[clamp, style]} {...props} />
  }

  return <Text numberOfLines={lines} ellipsizeMode="tail" style={style} {...props} />
}
