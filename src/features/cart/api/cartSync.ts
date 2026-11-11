import { useAuthStore } from '@/features/auth'
import { api } from '@/lib/api'

import { setCartRemote, useCartStore, type CartRemote } from '../store/cartStore'
import type { CartSnapshot } from '../types'

const remote: CartRemote = {
  add: (line) => api.post<CartSnapshot>('/cart/items', line),
  setQuantity: (key, quantity) => api.patch<CartSnapshot>(`/cart/items/${encodeURIComponent(key)}`, { quantity }),
  remove: (key) => api.delete<CartSnapshot>(`/cart/items/${encodeURIComponent(key)}`),
  applyVoucher: (code) => api.post<CartSnapshot>('/cart/voucher', { code }),
  clear: () => api.delete<CartSnapshot>('/cart'),
}

async function reload() {
  try {
    const snapshot = await api.get<CartSnapshot>('/cart')
    useCartStore.getState().replace(snapshot)
    // Dòng có sản phẩm đã ngừng bán: bỏ khỏi giỏ server luôn.
    for (const item of snapshot.items) if (item.available === false) void remote.remove(item.key).catch(() => undefined)
  } catch {
    // Mất mạng: giữ giỏ local, lần sau thao tác sẽ đồng bộ lại.
  }
}

/**
 * Đồng bộ giỏ theo trạng thái đăng nhập:
 * - Đăng nhập: gộp giỏ khách (đang có trên máy) vào giỏ tài khoản, rồi dùng giỏ server.
 * - Đăng xuất: ngắt server và xoá giỏ trên máy (giỏ vẫn còn trong tài khoản).
 */
export function startCartSync() {
  let currentUser: string | null = null

  async function onUser(userId: string | null) {
    if (userId === currentUser) return
    const previous = currentUser
    currentUser = userId
    if (!userId) {
      setCartRemote(null)
      if (previous) useCartStore.setState({ items: [], voucher: null, syncError: null })
      return
    }
    const { items, voucher } = useCartStore.getState()
    try {
      const snapshot = items.length || voucher
        ? await api.post<CartSnapshot>('/cart/merge', {
            items: items.map(({ productId, quantity, options }) => ({ productId, quantity, options })),
            voucher: voucher?.code,
          })
        : await api.get<CartSnapshot>('/cart')
      if (currentUser !== userId) return
      setCartRemote(remote, reload)
      useCartStore.getState().replace(snapshot)
    } catch {
      // Không gộp được (mất mạng): vẫn bật đồng bộ, giỏ local giữ nguyên.
      if (currentUser === userId) setCartRemote(remote, reload)
    }
  }

  void onUser(useAuthStore.getState().user?.id ?? null)
  return useAuthStore.subscribe((state) => void onUser(state.user?.id ?? null))
}
