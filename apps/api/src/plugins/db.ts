import { randomUUID } from 'node:crypto'
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { createPrismaAnalysisRunStore, createPrismaIssueStore, createPrismaRepositoryStore, type AnalysisRunRecord } from '@watchtower/db'
import type { AnalysisRunStatus, RepositoryCreateInput, VerificationRecord } from '@watchtower/contracts'
import { syncIssueJob, type IssueRecord, type SentryWebhookPayload } from '@watchtower/core'

type MemoryRepositoryRecord = RepositoryCreateInput & {
  id: string
}

type QueuedWebhook = SentryWebhookPayload
type AnalysisRunUpdateInput = {
  status: AnalysisRunStatus
  summary?: string
  rootCause?: string
  patchBranch?: string
  prUrl?: string
  confidence?: number
  verification?: VerificationRecord[]
}

declare module 'fastify' {
  interface FastifyInstance {
    repositoryStore: {
      create: (input: RepositoryCreateInput) => MemoryRepositoryRecord | Promise<MemoryRepositoryRecord>
      list: () => MemoryRepositoryRecord[] | Promise<MemoryRepositoryRecord[]>
    }
    issueStore: {
      list: () => IssueRecord[] | Promise<IssueRecord[]>
      findById?: (id: string) => IssueRecord | Promise<IssueRecord | undefined> | undefined
      findByExternalIssueId?: (repositoryId: string, externalIssueId: string) => IssueRecord | Promise<IssueRecord | undefined> | undefined
      upsert: (input: IssueRecord) => IssueRecord | Promise<IssueRecord>
      updateStatus: (id: string, status: IssueRecord['status']) => IssueRecord | Promise<IssueRecord>
      findOpenPrByExternalIssueId?: (repositoryId: string, externalIssueId: string) => boolean | Promise<boolean>
    }
    analysisRunStore: {
      create: (input: { issueId: string; status: AnalysisRunStatus }) => AnalysisRunRecord | Promise<AnalysisRunRecord>
      update: (id: string, input: AnalysisRunUpdateInput) => AnalysisRunRecord | Promise<AnalysisRunRecord>
      updateByIssueId: (issueId: string, input: AnalysisRunUpdateInput) => AnalysisRunRecord | Promise<AnalysisRunRecord>
      findLatestByIssueId: (issueId: string) => AnalysisRunRecord | Promise<AnalysisRunRecord | undefined> | undefined
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
  const analysisRuns = new Map<string, AnalysisRunRecord>()
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
          findById(id: string) {
            return issues.get(id)
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
  const analysisRunStore: FastifyInstance['analysisRunStore'] =
    storageMode === 'prisma'
      ? createPrismaAnalysisRunStore()
      : {
          async create(input: { issueId: string; status: AnalysisRunStatus }) {
            const record: AnalysisRunRecord = {
              id: randomUUID(),
              issueId: input.issueId,
              status: input.status,
              createdAt: new Date(),
            }
            analysisRuns.set(record.id, record)
            return record
          },
          async update(id: string, input: AnalysisRunUpdateInput) {
            const current = analysisRuns.get(id)

            if (!current) {
              throw new Error(`AnalysisRun not found: ${id}`)
            }

            const updated: AnalysisRunRecord = {
              ...current,
              ...input,
            }
            analysisRuns.set(id, updated)
            return updated
          },
          async updateByIssueId(issueId: string, input: AnalysisRunUpdateInput) {
            const latest = Array.from(analysisRuns.values())
              .filter(run => run.issueId === issueId)
              .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0]

            if (!latest) {
              throw new Error(`AnalysisRun not found for issue: ${issueId}`)
            }

            return this.update(latest.id, input)
          },
          async findLatestByIssueId(issueId: string) {
            return Array.from(analysisRuns.values())
              .filter(run => run.issueId === issueId)
              .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0]
          },
        }

  app.decorate('repositoryStore', repositoryStore)
  app.decorate('issueStore', issueStore)
  app.decorate('analysisRunStore', analysisRunStore)

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
