import { bodyFontFamily } from './tamagui.config'

// Measurements follow the 375px-wide prototype; content grows with the device width.
export const marketplace = {
  ink: '#171a1f',
  text: '#323743',
  muted: '#9095a2',
  secondary: '#565e6c',
  primary: '#00bdd6',
  purple: '#8b46ff',
  surface: '#f8f9fa',
  input: '#f3f4f6',
  border: '#f0f1f3',
  star: '#ffc329',
  starEmpty: '#dee1e6',
  bodyFont: bodyFontFamily,
} as const
