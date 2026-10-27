import { Asset } from 'expo-asset'

import { fontAssets, webFontFaces } from './fonts'

let injected = false

function injectFontFaces() {
  if (injected || typeof document === 'undefined') return
  injected = true
  const css = webFontFaces
    .map(
      ({ family, weight, asset }) =>
        `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;font-display:swap;src:url('${Asset.fromModule(fontAssets[asset]).uri}') format('truetype');}`,
    )
    .join('\n')
  const style = document.createElement('style')
  style.dataset.appFonts = 'true'
  style.textContent = css
  document.head.appendChild(style)
}

/** Web: khai báo @font-face theo weight (font-display: swap nên không cần chờ). */
export function useAppFonts(): boolean {
  injectFontFaces()
  return true
}
