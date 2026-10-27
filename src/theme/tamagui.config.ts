import { colors, createV6Config } from '@tamagui/config/v6'
import { Platform } from 'react-native'
import { createFont, createTamagui } from 'tamagui'

import { animations } from './animations'
import { epilogueFace, interFace } from './fonts'

// Bảng màu theo design system của bản thiết kế. Dùng qua class: `bg-primary`, `text-neutral-500`...
// `neutral-*` ghi đè thang neutral mặc định của Tailwind cho khớp design.
export const appColors = {
  primary: '#00bdd6',
  'primary-50': '#ebfdff',
  'neutral-900': '#171a1f',
  'neutral-800': '#222730',
  'neutral-700': '#323842',
  'neutral-600': '#565e6c',
  'neutral-550': '#626a76',
  'neutral-500': '#9095a0',
  'neutral-400': '#bcc1ca',
  'neutral-300': '#dee1e6',
  'neutral-200': '#f3f4f6',
  'neutral-100': '#f8f9fa',
  secondary: '#8353e2',
  'secondary-300': '#cab7f2',
  'secondary-50': '#f5f2fd',
  'secondary-25': '#fbfafe',
  success: '#17a948',
  'success-700': '#197f3b',
  'success-800': '#0e642a',
  'success-50': '#eefcf3',
  danger: '#de3b40',
  warning: '#f3c63f',
  muted: '#6a6d75',
  badge: '#e7000b',
} as const

const baseConfig = createV6Config({
  ...colors,
  colorTokens: { ...colors.colorTokens, ...appColors },
})

// Native: family là tên file đã nạp (weight khác lấy qua `face`). Web: family thật + @font-face.
const fontFamily = (web: string, native: string) =>
  Platform.OS === 'web' ? `${web}, system-ui, sans-serif` : native

/** Dùng cho component RN thuần (TextInput, nhãn tab) không đi qua Tamagui. */
export const bodyFontFamily = fontFamily('Inter', 'Inter_400Regular')

/** Font body theo weight cho component RN thuần (native cần đúng tên file font của weight đó). */
export function bodyFont(weight: keyof typeof interFace) {
  return {
    fontFamily: fontFamily('Inter', interFace[weight]?.normal ?? 'Inter_400Regular'),
    // Native: weight đã nằm trong file font; đặt thêm fontWeight có thể khiến iOS rơi về font hệ thống.
    ...(Platform.OS === 'web' ? { fontWeight: weight } : null),
  } as const
}

export const config = createTamagui({
  ...baseConfig,
  fonts: {
    body: createFont({
      ...baseConfig.fonts.body,
      family: fontFamily('Inter', 'Inter_400Regular'),
      face: interFace,
    }),
    heading: createFont({
      ...baseConfig.fonts.heading,
      family: fontFamily('Epilogue', 'Epilogue_700Bold'),
      face: epilogueFace,
    }),
  },
  themes: {
    ...baseConfig.themes,
    // Theme light mặc định có nền #faf9fb; app dùng nền trắng tinh.
    light: { ...baseConfig.themes.light, background: '#ffffff', color: appColors['neutral-900'] },
  },
  animations,
})

export type AppConfig = typeof config

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation của Tamagui
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
