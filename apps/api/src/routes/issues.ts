import type { FastifyInstance } from 'fastify'

export async function issueRoutes(app: FastifyInstance) {
  app.get('/issues', async () => app.issueStore.list())

  app.get('/issues/:issueId', async (request, reply) => {
    const params = request.params as { issueId?: string }
    const issueId = params.issueId

    if (!issueId || !app.issueStore.findById) {
      return reply.code(404).send({ error: 'issue not found' })
    }

    const issue = await app.issueStore.findById(issueId)

    if (!issue) {
      return reply.code(404).send({ error: 'issue not found' })
    }

    const latestAnalysis = await app.analysisRunStore.findLatestByIssueId(issue.id)

    return {
      ...issue,
      latestAnalysis,
    }
  })
}
