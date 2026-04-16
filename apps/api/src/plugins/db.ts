import { randomUUID } from 'node:crypto'
import fp from 'fastify-plugin'
import type { RepositoryCreateInput } from '@watchtower/contracts'
import { syncIssueJob, type IssueRecord, type SentryWebhookPayload } from '@watchtower/core'

type RepositoryRecord = RepositoryCreateInput & {
  id: string
}

type QueuedWebhook = SentryWebhookPayload

declare module 'fastify' {
  interface FastifyInstance {
    repositoryStore: {
      create: (input: RepositoryCreateInput) => RepositoryRecord
      list: () => RepositoryRecord[]
    }
    issueStore: {
      list: () => IssueRecord[]
      upsert: (input: IssueRecord) => IssueRecord
      updateStatus: (id: string, status: IssueRecord['status']) => IssueRecord
      findOpenPrByExternalIssueId: (repositoryId: string, externalIssueId: string) => boolean
    }
    queueIssueSync: (payload: QueuedWebhook) => Promise<void>
    queuedWebhooks: QueuedWebhook[]
  }
}

export const dbPlugin = fp(async (app) => {
  const repositories: RepositoryRecord[] = []
  const issues = new Map<string, IssueRecord>()
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
      return Array.from(issues.values())
    },
    upsert(input) {
      issues.set(input.id, input)
      return input
    },
    updateStatus(id, status) {
      const current = issues.get(id)

      if (!current) {
        throw new Error(`Issue not found: ${id}`)
      }

      const updated = { ...current, status }
      issues.set(id, updated)
      return updated
    },
    findOpenPrByExternalIssueId() {
      return false
    },
  })

  app.decorate('queuedWebhooks', queuedWebhooks)
  app.decorate('queueIssueSync', async (payload) => {
    queuedWebhooks.push(payload)

    if (repositories.length === 0) {
      return
    }

    await syncIssueJob(payload, {
      repositoryStore: app.repositoryStore,
      issueStore: app.issueStore,
      analysisQueue: {
        add: async () => undefined,
      },
    })
  })
})
