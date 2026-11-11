// HTTP client dùng chung cho mọi feature gọi backend (`server/`).
// File này không import React Native/Expo để test được bằng `node --test`.
// Phần xác thực (gắn token, tự refresh) được feature auth đăng ký qua `configureApiAuth`,
// nên lib không phải import ngược vào feature.

/** Lỗi từ API theo định dạng `{ success: false, error: { code, message, details } }`. */
export class ApiError extends Error {
  // Khai báo field tường minh (không dùng `constructor(readonly ...)`) để `node --test`
  // chạy được file này ở chế độ strip-types.
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  /** Lỗi theo từng field từ VALIDATION_ERROR: `{ email: 'Email không hợp lệ', ... }`. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {}
    const errors: Record<string, string> = {}
    for (const item of this.details as { field?: string; message?: string }[]) {
      if (item.field && item.message && !errors[item.field]) errors[item.field] = item.message
    }
    return errors
  }
}

export const NETWORK_ERROR = 'NETWORK_ERROR'

type AuthHooks = {
  getAccessToken: () => string | null
  /** Làm mới access token; trả về token mới hoặc null nếu phiên đã hết. */
  refresh: () => Promise<string | null>
}

type ClientConfig = {
  baseUrl: string
  fetch: typeof fetch
  auth?: AuthHooks
}

const config: ClientConfig = {
  baseUrl: '',
  fetch: (...args) => fetch(...args),
}

export function configureApi(options: Partial<Pick<ClientConfig, 'baseUrl' | 'fetch'>>) {
  Object.assign(config, options)
}

export function configureApiAuth(hooks: AuthHooks | undefined) {
  config.auth = hooks
}

export function getApiBaseUrl() {
  return config.baseUrl
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Gắn access token. Mặc định true. */
  auth?: boolean
  signal?: AbortSignal
}

async function send(path: string, options: RequestOptions, token: string | null) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await config.fetch(`${config.baseUrl}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    throw new ApiError(0, NETWORK_ERROR, 'Không kết nối được máy chủ, vui lòng kiểm tra mạng')
  }

  let payload: any = null
  try {
    payload = await response.json()
  } catch {
    // Phản hồi không phải JSON (proxy lỗi, HTML...) — xử lý bên dưới.
  }

  if (payload?.success === true) return payload.data
  const error = payload?.error
  throw new ApiError(
    response.status,
    typeof error?.code === 'string' ? error.code : 'UNKNOWN_ERROR',
    typeof error?.message === 'string' ? error.message : `Máy chủ trả lỗi ${response.status}`,
    error?.details,
  )
}

/**
 * Gọi API và trả về `data`. Nếu access token hết hạn (401 TOKEN_EXPIRED) thì tự refresh
 * một lần rồi gửi lại; refresh thất bại thì ném lại lỗi gốc để UI đưa về màn đăng nhập.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth !== false && !!config.auth
  const token = useAuth ? config.auth!.getAccessToken() : null

  try {
    return await send(path, options, token)
  } catch (error) {
    if (!useAuth || !(error instanceof ApiError) || error.status !== 401 || error.code !== 'TOKEN_EXPIRED') throw error
    const fresh = await config.auth!.refresh()
    if (!fresh) throw error
    return send(path, options, fresh)
  }
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) => apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method'>) => apiRequest<T>(path, { ...options, method: 'DELETE' }),
}
