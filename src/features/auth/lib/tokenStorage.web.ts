// Web không có expo-secure-store → dùng localStorage. Chấp nhận được cho bản demo trên trình duyệt;
// nếu phát hành web thật nên chuyển refresh token sang cookie HttpOnly do server đặt.
const KEY = 'auth.refreshToken'

function storage(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export const tokenStorage = {
  get: async () => storage()?.getItem(KEY) ?? null,
  set: async (token: string) => storage()?.setItem(KEY, token),
  clear: async () => storage()?.removeItem(KEY),
}
