import { resolveApiBaseUrl } from './baseUrl'
import { configureApi } from './client'

configureApi({ baseUrl: resolveApiBaseUrl() })

export { api, ApiError, apiRequest, configureApiAuth, getApiBaseUrl, NETWORK_ERROR } from './client'
export type { RequestOptions } from './client'
export { mediaUrl, pickImages, uploadImage } from './media'
export type { PickedImage, UploadedImage, UploadPurpose } from './media'
