import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { search } from '../domain/search/service'
import type { SearchScope } from '../domain/search/types'

const SearchBodySchema = z.object({
  tenantId: z.string().min(1),
  query: z.string().min(1),
  scope: z.enum(['chat', 'inbox', 'calendar', 'all']).default('all')
})

export async function registerSearchRoutes(app: FastifyInstance) {
  app.post('/search', async (request, reply) => {
    const parsed = SearchBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body' })
    }
    const data = parsed.data
    try {
      const results = await search({
        tenantId: data.tenantId,
        query: data.query,
        scope: data.scope as SearchScope
      })
      return { results }
    } catch (error) {
      request.log.error({ error }, 'search_failed')
      return reply.status(500).send({ error: 'search_unexpected_error' })
    }
  })
}
