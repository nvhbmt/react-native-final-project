import { Asset } from 'expo-asset'
import { useEffect, useState } from 'react'

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

/** Wait for the same static faces used on native before revealing the UI. */
export function useAppFonts(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    injectFontFaces()
    let mounted = true
    Promise.all(webFontFaces.map(({ family, weight }) => document.fonts.load(`${weight} 16px "${family}"`)))
      .catch(() => undefined)
      .finally(() => { if (mounted) setReady(true) })
    return () => { mounted = false }
  }, [])
  return ready
}
