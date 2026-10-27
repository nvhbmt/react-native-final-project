import { useMemo } from 'react'

import { computeTotals, useCartStore } from '../store/cartStore'

export function useCartTotals() {
  const items = useCartStore((s) => s.items)
  const rate = useCartStore((s) => s.voucher?.rate ?? 0)
  return useMemo(() => computeTotals(items, rate), [items, rate])
}
