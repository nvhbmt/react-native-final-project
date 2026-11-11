import * as ImagePicker from 'expo-image-picker'

import { api, getApiBaseUrl } from './client'

/** Ảnh do server phục vụ có URL tương đối (`/uploads/…`) — ghép với địa chỉ API. */
export function mediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return url.startsWith('/') ? `${getApiBaseUrl()}${url}` : url
}

export type UploadPurpose = 'avatar' | 'feedback' | 'review'
export type UploadedImage = { id: string; url: string }
/** Ảnh đã chọn trên máy, kèm base64 để upload. */
export type PickedImage = { uri: string; base64: string }

/** Mở thư viện ảnh; trả về ảnh đã chọn (JPEG nén) hoặc [] nếu huỷ. */
export async function pickImages(options: { multiple?: boolean; limit?: number; square?: boolean } = {}): Promise<PickedImage[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: options.multiple ?? false,
    selectionLimit: options.limit ?? 1,
    allowsEditing: options.square ?? false,
    aspect: options.square ? [1, 1] : undefined,
    quality: 0.6,
    base64: true,
  })
  if (result.canceled) return []
  return result.assets.flatMap((asset) => {
    const base64 = asset.base64 ?? (asset.uri.startsWith('data:') ? asset.uri.slice(asset.uri.indexOf(',') + 1) : null)
    return base64 ? [{ uri: asset.uri, base64 }] : []
  })
}

/**
 * Upload ảnh dạng base64 trong JSON (server: `POST /uploads`). Dùng base64 thay cho FormData
 * vì gửi file theo URI qua FormData không ổn định giữa iOS/Android/web.
 */
export function uploadImage(image: PickedImage, purpose: UploadPurpose) {
  return api.post<UploadedImage>('/uploads', { purpose, data: image.base64 })
}
