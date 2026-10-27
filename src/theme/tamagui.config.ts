import { colors, createV6Config } from '@tamagui/config/v6'
import { createTamagui } from 'tamagui'

import { animations } from './animations'

// Màu dùng chung, gọi qua token: `bg-primary`, `text-primary`, `text-muted`, `bg-badge`.
export const appColors = {
  primary: '#00bdd6',
  muted: '#6a6d75',
  badge: '#e7000b',
} as const

const baseConfig = createV6Config({
  ...colors,
  colorTokens: { ...colors.colorTokens, ...appColors },
})

export const config = createTamagui({
  ...baseConfig,
  fonts: {
    ...baseConfig.fonts,
    marketplaceBody: { ...baseConfig.fonts.body, family: 'MarketplaceInter' },
    marketplaceHeading: { ...baseConfig.fonts.heading, family: 'MarketplaceManrope' },
  },
  themes: {
    ...baseConfig.themes,
    // Theme light mặc định có nền #faf9fb; app dùng nền trắng tinh.
    light: { ...baseConfig.themes.light, background: '#ffffff' },
  },
  animations,
})

export type AppConfig = typeof config

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation của Tamagui
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
