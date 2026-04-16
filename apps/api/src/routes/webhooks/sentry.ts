import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { isSentrySignatureValid } from '../../lib/sentry-signature.js'

const sentryWebhookSchema = z.object({
  action: z.string(),
  data: z.object({
    issue: z.object({
      id: z.string(),
      title: z.string().optional(),
    }),
  }),
})

export async function sentryWebhookRoutes(app: FastifyInstance) {
  app.post('/webhooks/sentry', async (request, reply) => {
    if (!isSentrySignatureValid()) {
      return reply.code(401).send({ error: 'invalid signature' })
    }

    const event = sentryWebhookSchema.parse(request.body)
    await app.queueIssueSync(event)
    return reply.code(202).send({ accepted: true })
  })
}
