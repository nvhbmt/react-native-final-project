import { useCallback, useEffect, useState } from 'react'

import { useCurrentUser } from '@/features/auth'
import { ApiError } from '@/lib/api'

import { invalidateOrders, ordersApi } from '../api/ordersApi'
import type { Order } from '../types'

/**
 * Tải một đơn; `pollMs` > 0 thì tự tải lại định kỳ khi đơn còn chờ thanh toán
 * (để biết lúc webhook SePay xác nhận tiền).
 */
export function useOrder(id: string | undefined, pollMs = 0) {
  const user = useCurrentUser()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!id || !user) return
    let alive = true
    const load = () => ordersApi.get(id).then(
      (next) => {
        if (!alive) return
        setOrder((previous) => {
          if (previous && previous.status !== next.status) invalidateOrders()
          return next
        })
        setError(null)
      },
      (e: unknown) => { if (alive) setError(e instanceof ApiError ? e.message : 'Không tải được đơn hàng') },
    )
    void load()
    const timer = pollMs > 0 ? setInterval(() => void load(), pollMs) : undefined
    return () => {
      alive = false
      if (timer) clearInterval(timer)
    }
  }, [id, user, pollMs, attempt])

  const update = useCallback((next: Order) => {
    setOrder(next)
    invalidateOrders()
  }, [])

  return { order, error, retry: () => setAttempt((n) => n + 1), update }
}
