export function productPath(id: string, suffix: '' | '/related' = '') {
  return `/products/${encodeURIComponent(id)}${suffix}`
}
