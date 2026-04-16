import { randomUUID } from 'node:crypto'
import fp from 'fastify-plugin'
import type { RepositoryCreateInput } from '@watchtower/contracts'

type RepositoryRecord = RepositoryCreateInput & {
  id: string
}

type QueuedWebhook = Record<string, unknown>

declare module 'fastify' {
  interface FastifyInstance {
    repositoryStore: {
      create: (input: RepositoryCreateInput) => RepositoryRecord
      list: () => RepositoryRecord[]
    }
    issueStore: {
      list: () => Array<Record<string, unknown>>
    }
    queueIssueSync: (payload: QueuedWebhook) => Promise<void>
    queuedWebhooks: QueuedWebhook[]
  }
}

export const dbPlugin = fp(async (app) => {
  const repositories: RepositoryRecord[] = []
  const issues: Array<Record<string, unknown>> = []
  const queuedWebhooks: QueuedWebhook[] = []

  app.decorate('repositoryStore', {
    create(input) {
      const record = { id: randomUUID(), ...input }
      repositories.push(record)
      return record
    },
    list() {
      return repositories
    },
  })

  app.decorate('issueStore', {
    list() {
      return issues
    },
  })

  app.decorate('queuedWebhooks', queuedWebhooks)
  app.decorate('queueIssueSync', async (payload) => {
    queuedWebhooks.push(payload)
  })
})
