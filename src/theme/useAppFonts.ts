import { useFonts } from 'expo-font'

import { fontAssets } from './fonts'

/** Native: nạp file font qua expo-font. Trả về true khi font đã sẵn sàng. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(fontAssets)
  // Lỗi nạp font không nên chặn app — rơi về font hệ thống.
  return loaded || !!error
}
