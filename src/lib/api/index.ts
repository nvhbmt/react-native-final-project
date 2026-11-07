import { resolveApiBaseUrl } from './baseUrl'
import { configureApi } from './client'

configureApi({ baseUrl: resolveApiBaseUrl() })

export { api, ApiError, apiRequest, configureApiAuth, getApiBaseUrl, NETWORK_ERROR } from './client'
export type { RequestOptions } from './client'
