import { Hono } from 'hono'

import { ok } from '@/lib/http.ts'
import { validate } from '@/lib/validate.ts'

import { listingQuery, productParams, relatedQuery } from './schemas.ts'
import type { CatalogService } from './service.ts'

export function catalogRoutes(service: CatalogService) {
  return new Hono()
    .get('/home', async (c) => ok(c, await service.home()))
    .get('/categories', async (c) => ok(c, await service.categories()))
    .get('/products', validate('query', listingQuery), async (c) => ok(c, await service.list(c.req.valid('query'))))
    .get('/products/:id/related', validate('param', productParams), validate('query', relatedQuery), async (c) =>
      ok(c, await service.related(c.req.valid('param').id, c.req.valid('query').limit)))
    .get('/products/:id/size-guide', validate('param', productParams), async (c) =>
      ok(c, await service.sizeGuide(c.req.valid('param').id)))
    .get('/products/:id', validate('param', productParams), async (c) => ok(c, await service.detail(c.req.valid('param').id)))
}
