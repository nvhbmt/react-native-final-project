import { appColors } from './tamagui.config'

let injected = false

/**
 * CSS toàn cục chỉ cho web:
 * - Bỏ viền focus mặc định của trình duyệt trên ô nhập; các ô tự vẽ trạng thái focus (viền màu primary).
 * - Giữ nguyên nền/màu chữ khi Chrome autofill thay vì phủ nền xanh nhạt.
 */
export function injectWebGlobalStyles() {
  if (injected || typeof document === 'undefined') return
  injected = true
  const style = document.createElement('style')
  style.dataset.appGlobal = 'true'
  style.textContent = `
input, textarea { outline: none; }
input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
  -webkit-text-fill-color: ${appColors['neutral-900']};
  caret-color: ${appColors['neutral-900']};
  transition: background-color 600000s 0s, color 600000s 0s;
}`
  document.head.appendChild(style)
}
