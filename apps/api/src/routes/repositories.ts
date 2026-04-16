import type { FastifyInstance } from 'fastify'
import { repositoryCreateSchema } from '@watchtower/contracts'

export async function repositoryRoutes(app: FastifyInstance) {
  app.get('/repositories', async () => app.repositoryStore.list())

  app.post('/repositories', async (request, reply) => {
    const input = repositoryCreateSchema.parse(request.body)
    const repository = app.repositoryStore.create(input)
    return reply.code(201).send(repository)
  })
}
