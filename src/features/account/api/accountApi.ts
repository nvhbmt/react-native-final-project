import type { User } from '@/features/auth'
import { api } from '@/lib/api'

export type Address = { id: string; recipientName: string; phone: string; line1: string; city: string; isDefault: boolean }
export type AddressInput = Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }

export const accountApi = {
  updateProfile: (input: { fullName?: string; phone?: string | null; promoNotifications?: boolean }) => api.patch<User>('/users/me', input),
  setAvatar: (uploadId: string | null) => api.put<User>('/users/me/avatar', { uploadId }),
  deleteAccount: (password: string) => api.delete<{ deleted: true }>('/users/me', { body: { password } }),
  addresses: () => api.get<Address[]>('/users/me/addresses'),
  addAddress: (input: AddressInput) => api.post<Address[]>('/users/me/addresses', input),
  updateAddress: (id: string, input: Partial<AddressInput>) => api.patch<Address[]>(`/users/me/addresses/${id}`, input),
  removeAddress: (id: string) => api.delete<Address[]>(`/users/me/addresses/${id}`),
}
