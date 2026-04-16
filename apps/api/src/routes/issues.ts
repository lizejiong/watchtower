import type { FastifyInstance } from 'fastify'

export async function issueRoutes(app: FastifyInstance) {
  app.get('/issues', async () => app.issueStore.list())
}
