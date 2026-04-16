import { randomUUID } from 'node:crypto'
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { createPrismaIssueStore, createPrismaRepositoryStore } from '@watchtower/db'
import type { RepositoryCreateInput } from '@watchtower/contracts'
import { syncIssueJob, type IssueRecord, type SentryWebhookPayload } from '@watchtower/core'

type MemoryRepositoryRecord = RepositoryCreateInput & {
  id: string
}

type QueuedWebhook = SentryWebhookPayload

declare module 'fastify' {
  interface FastifyInstance {
    repositoryStore: {
      create: (input: RepositoryCreateInput) => MemoryRepositoryRecord | Promise<MemoryRepositoryRecord>
      list: () => MemoryRepositoryRecord[] | Promise<MemoryRepositoryRecord[]>
    }
    issueStore: {
      list: () => IssueRecord[] | Promise<IssueRecord[]>
      findByExternalIssueId?: (repositoryId: string, externalIssueId: string) => IssueRecord | Promise<IssueRecord | undefined> | undefined
      upsert: (input: IssueRecord) => IssueRecord | Promise<IssueRecord>
      updateStatus: (id: string, status: IssueRecord['status']) => IssueRecord | Promise<IssueRecord>
      findOpenPrByExternalIssueId?: (repositoryId: string, externalIssueId: string) => boolean | Promise<boolean>
    }
    queueIssueSync: (payload: QueuedWebhook) => Promise<void>
    queuedWebhooks: QueuedWebhook[]
  }
}

export const dbPlugin = fp(async (app) => {
  const storageMode =
    process.env.WATCHTOWER_STORAGE_MODE ?? (process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL ? 'memory' : 'prisma')
  const repositories: MemoryRepositoryRecord[] = []
  const issues = new Map<string, IssueRecord>()
  const queuedWebhooks: QueuedWebhook[] = []
  const repositoryStore: FastifyInstance['repositoryStore'] =
    storageMode === 'prisma'
      ? createPrismaRepositoryStore()
      : {
          create(input: RepositoryCreateInput) {
            const record = { id: randomUUID(), ...input }
            repositories.push(record)
            return record
          },
          list() {
            return repositories
          },
        }
  const issueStore: FastifyInstance['issueStore'] =
    storageMode === 'prisma'
      ? createPrismaIssueStore()
      : {
          list() {
            return Array.from(issues.values())
          },
          findByExternalIssueId(repositoryId: string, externalIssueId: string) {
            return Array.from(issues.values()).find(
              issue => issue.repositoryId === repositoryId && issue.externalIssueId === externalIssueId,
            )
          },
          upsert(input: IssueRecord) {
            issues.set(input.id, input)
            return input
          },
          updateStatus(id: string, status: IssueRecord['status']) {
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
        }

  app.decorate('repositoryStore', repositoryStore)
  app.decorate('issueStore', issueStore)

  app.decorate('queuedWebhooks', queuedWebhooks)
  app.decorate('queueIssueSync', async (payload) => {
    queuedWebhooks.push(payload)

    const availableRepositories = await repositoryStore.list()
    if (availableRepositories.length === 0) {
      return
    }

    await syncIssueJob(payload, {
      repositoryStore,
      issueStore,
      analysisQueue: {
        add: async () => undefined,
      },
    })
  })
})
