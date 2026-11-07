import * as SecureStore from 'expo-secure-store'

// Native: refresh token nằm trong Keychain (iOS) / Keystore (Android), không đồng bộ sang máy khác.
const KEY = 'auth.refreshToken'
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
}

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(KEY, options),
  set: (token: string) => SecureStore.setItemAsync(KEY, token, options),
  clear: () => SecureStore.deleteItemAsync(KEY, options),
}
