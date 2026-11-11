import { useState } from 'react'

import type { ProductPage } from '../types'
import { useCatalogRequest } from './useCatalogRequest'

export function useProductPages<Page extends { items: unknown[]; nextCursor: string | null } = ProductPage>(path?: string, version = '', auth = false) {
  const scope = `${path}:${version}`
  const [more, setMore] = useState<{ scope: string; cursor: string; items: Page['items'][number][] }>()
  if (more && more.scope !== scope) setMore(undefined)
  const first = useCatalogRequest<Page>(path, { version, auth })
  const active = more?.scope === scope ? more : undefined
  const nextPath = path && active ? `${path}${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(active.cursor)}` : undefined
  const next = useCatalogRequest<Page>(nextPath, { version, auth })
  const items: Page['items'][number][] = active ? [...active.items, ...(next.data?.items ?? [])] : first.data?.items ?? []
  const cursor = active ? next.data?.nextCursor : first.data?.nextCursor

  return {
    ...first,
    items,
    hasMore: Boolean(cursor),
    loadingMore: next.loading,
    moreError: next.error,
    retryMore: next.retry,
    loadMore: () => { if (cursor) setMore({ scope, cursor, items }) },
  }
}
