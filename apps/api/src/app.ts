import Fastify from 'fastify'
import { dbPlugin } from './plugins/db.js'
import { envPlugin } from './plugins/env.js'
import { healthRoutes } from './routes/health.js'
import { issueRoutes } from './routes/issues.js'
import { repositoryRoutes } from './routes/repositories.js'
import { sentryWebhookRoutes } from './routes/webhooks/sentry.js'

export async function buildApp() {
  const app = Fastify()

  await app.register(envPlugin)
  await app.register(dbPlugin)
  await app.register(healthRoutes)
  await app.register(repositoryRoutes)
  await app.register(issueRoutes)
  await app.register(sentryWebhookRoutes)

  return app
}
