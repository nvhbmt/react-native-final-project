import { Platform } from 'react-native'

/**
 * Cho phép chọn/sao chép chữ. `Text` của @tamagui/tailwind đẩy nguyên prop `selectable` xuống DOM trên web
 * (React cảnh báo "non-boolean attribute"); web vốn chọn được chữ nên chỉ cần prop này trên native.
 */
export const selectableText = Platform.OS === 'web' ? {} : ({ selectable: true } as const)
