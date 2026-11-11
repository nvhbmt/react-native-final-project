import { router } from 'expo-router'
import { create } from 'zustand'

import { useAuthStore } from '@/features/auth'
import type { Product } from '@/features/products/types'
import { api } from '@/lib/api'

type FavoritesState = {
  ids: string[]
  items: Product[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  load: () => Promise<void>
  /** Bật/tắt yêu thích (cập nhật ngay, hoàn tác nếu server lỗi). Khách thì mở màn đăng nhập. */
  toggle: (product: Pick<Product, 'id'> & Partial<Product>) => Promise<void>
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: [],
  items: [],
  status: 'idle',

  async load() {
    if (!useAuthStore.getState().user) return
    set({ status: get().status === 'ready' ? 'ready' : 'loading' })
    try {
      const data = await api.get<{ items: Product[]; ids: string[] }>('/favorites')
      set({ ids: data.ids, items: data.items, status: 'ready' })
    } catch {
      set({ status: get().status === 'ready' ? 'ready' : 'error' })
    }
  },

  async toggle(product) {
    if (!useAuthStore.getState().user) {
      router.push('/login')
      return
    }
    const before = { ids: get().ids, items: get().items }
    const liked = before.ids.includes(product.id)
    set({
      ids: liked ? before.ids.filter((id) => id !== product.id) : [product.id, ...before.ids],
      items: liked ? before.items.filter((item) => item.id !== product.id) : product.name ? [product as Product, ...before.items] : before.items,
    })
    try {
      if (liked) await api.delete(`/favorites/${encodeURIComponent(product.id)}`)
      else await api.put(`/favorites/${encodeURIComponent(product.id)}`)
      if (!liked && !product.name) void get().load()
    } catch {
      set(before)
    }
  },
}))

export const useIsFavorite = (productId: string) => useFavoritesStore((s) => s.ids.includes(productId))
export const useFavoriteCount = () => useFavoritesStore((s) => s.ids.length)

/** Nạp danh sách khi đăng nhập, xoá khi đăng xuất. */
export function startFavoritesSync() {
  let current: string | null = null
  const onUser = (userId: string | null) => {
    if (userId === current) return
    current = userId
    if (userId) void useFavoritesStore.getState().load()
    else useFavoritesStore.setState({ ids: [], items: [], status: 'idle' })
  }
  onUser(useAuthStore.getState().user?.id ?? null)
  return useAuthStore.subscribe((state) => onUser(state.user?.id ?? null))
}
