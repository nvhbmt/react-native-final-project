import {
  Epilogue_500Medium,
  Epilogue_600SemiBold,
  Epilogue_700Bold,
} from '@expo-google-fonts/epilogue'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'

// Inter cho nội dung, Epilogue cho tiêu đề (theo design).
// Key = tên font đăng ký với expo-font trên native, value = file font.
export const fontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Epilogue_500Medium,
  Epilogue_600SemiBold,
  Epilogue_700Bold,
} as const

export type FontAssetName = keyof typeof fontAssets

type Face = Partial<Record<'400' | '500' | '600' | '700', { normal: FontAssetName }>>

// Native không tự chọn file theo fontWeight → Tamagui map weight sang đúng file qua `face`.
export const interFace: Face = {
  '400': { normal: 'Inter_400Regular' },
  '500': { normal: 'Inter_500Medium' },
  '600': { normal: 'Inter_600SemiBold' },
  '700': { normal: 'Inter_700Bold' },
}

export const epilogueFace: Face = {
  '500': { normal: 'Epilogue_500Medium' },
  '600': { normal: 'Epilogue_600SemiBold' },
  '700': { normal: 'Epilogue_700Bold' },
}

// Web: các file trên được khai báo @font-face chung một family, trình duyệt tự chọn theo weight.
export const webFontFaces: { family: string; weight: number; asset: FontAssetName }[] = [
  { family: 'Inter', weight: 400, asset: 'Inter_400Regular' },
  { family: 'Inter', weight: 500, asset: 'Inter_500Medium' },
  { family: 'Inter', weight: 600, asset: 'Inter_600SemiBold' },
  { family: 'Inter', weight: 700, asset: 'Inter_700Bold' },
  { family: 'Epilogue', weight: 500, asset: 'Epilogue_500Medium' },
  { family: 'Epilogue', weight: 600, asset: 'Epilogue_600SemiBold' },
  { family: 'Epilogue', weight: 700, asset: 'Epilogue_700Bold' },
]
