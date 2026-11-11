import { AppHeader } from '@/components/ui/AppHeader'
import { Screen } from '@/components/ui/Screen'
import { CatalogStatus } from '@/features/products/components/CatalogStatus'
import { ApiError } from '@/lib/api'

export function ProductStatus({ title, loading, error, retry }: { title: string; loading: boolean; error?: unknown; retry: () => void }) {
  const missing = error instanceof ApiError && error.status === 404
  return (
    <Screen header={<AppHeader title={title} />}>
      <CatalogStatus loading={loading} message={loading ? undefined : missing || !error ? 'Không tìm thấy sản phẩm.' : 'Không tải được sản phẩm này.'} onRetry={error && !missing ? retry : undefined} />
    </Screen>
  )
}
