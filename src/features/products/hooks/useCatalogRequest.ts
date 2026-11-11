import { useEffect, useState } from 'react'

import { api } from '@/lib/api'

export function useCatalogRequest<T>(path?: string, { auth = false, version = '' }: { auth?: boolean; version?: string } = {}) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: T; error?: unknown }>()
  const key = `${attempt}:${version}:${path}`

  useEffect(() => {
    if (!path) return
    const request = new AbortController()
    const timeout = setTimeout(() => {
      request.abort()
      setResult({ key, error: new Error('Hết thời gian chờ phản hồi.') })
    }, 12_000)
    api.get<T>(path, { auth, signal: request.signal }).then(
      (data) => { if (!request.signal.aborted) setResult({ key, data }) },
      (error: unknown) => { if (!request.signal.aborted) setResult({ key, error }) },
    ).finally(() => clearTimeout(timeout))

    return () => {
      clearTimeout(timeout)
      request.abort()
    }
  }, [auth, key, path])

  const current = result?.key === key ? result : undefined
  return { data: current?.data, error: current?.error, loading: Boolean(path && !current), retry: () => setAttempt((value) => value + 1) }
}
