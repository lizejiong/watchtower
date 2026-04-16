import { Prisma } from '@prisma/client'
import type { AnalysisRunStatus, RepositoryCreateInput, VerificationRecord } from '@watchtower/contracts'
import type { IssueRecord, IssueStore, RepositoryRecord, RepositoryStore } from '@watchtower/core'
import { getDbClient } from './client.js'

function parseAutoRepairRules(value: Prisma.JsonValue | null) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return undefined
  }

  return value as Record<string, unknown>
}

function parseVerificationCmds(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function mapRepository(record: {
  id: string
  name: string
  localPath: string
  remoteUrl: string
  defaultBranch: string
  provider: string
  sentryOrgSlug: string
  sentryProjectSlug: string
  autoRepairEnabled: boolean
  autoRepairRules: Prisma.JsonValue | null
  verificationCmds: Prisma.JsonValue
}): RepositoryRecord {
  return {
    id: record.id,
    name: record.name,
    localPath: record.localPath,
    remoteUrl: record.remoteUrl,
    defaultBranch: record.defaultBranch,
    provider: record.provider as RepositoryCreateInput['provider'],
    sentryOrgSlug: record.sentryOrgSlug,
    sentryProjectSlug: record.sentryProjectSlug,
    autoRepairEnabled: record.autoRepairEnabled,
    autoRepairRules: parseAutoRepairRules(record.autoRepairRules),
    verificationCmds: parseVerificationCmds(record.verificationCmds),
  }
}

function mapIssue(record: {
  id: string
  repositoryId: string
  externalIssueId: string
  title: string
  culprit: string | null
  level: string | null
  status: string
}): IssueRecord {
  return {
    id: record.id,
    repositoryId: record.repositoryId,
    externalIssueId: record.externalIssueId,
    title: record.title,
    culprit: record.culprit ?? undefined,
    level: record.level ?? undefined,
    status: record.status as IssueRecord['status'],
  }
}

export interface AnalysisRunRecord {
  id: string
  issueId: string
  status: AnalysisRunStatus
  summary?: string
  rootCause?: string
  patchBranch?: string
  prUrl?: string
  confidence?: number
  verification?: VerificationRecord[]
  createdAt: Date
}

function parseVerification(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value as VerificationRecord[]
}

function mapAnalysisRun(record: {
  id: string
  issueId: string
  status: string
  summary: string | null
  rootCause: string | null
  patchBranch: string | null
  prUrl: string | null
  confidence: number | null
  verification: Prisma.JsonValue | null
  createdAt: Date
}): AnalysisRunRecord {
  return {
    id: record.id,
    issueId: record.issueId,
    status: record.status as AnalysisRunStatus,
    summary: record.summary ?? undefined,
    rootCause: record.rootCause ?? undefined,
    patchBranch: record.patchBranch ?? undefined,
    prUrl: record.prUrl ?? undefined,
    confidence: record.confidence ?? undefined,
    verification: parseVerification(record.verification),
    createdAt: record.createdAt,
  }
}

export function createPrismaRepositoryStore(client = getDbClient()): RepositoryStore & {
  create(input: RepositoryCreateInput): Promise<RepositoryRecord>
  findById(id: string): Promise<RepositoryRecord | undefined>
} {
  return {
    async create(input: RepositoryCreateInput) {
      const record = await client.repository.create({
        data: {
          name: input.name,
          localPath: input.localPath,
          remoteUrl: input.remoteUrl,
          defaultBranch: input.defaultBranch,
          provider: input.provider,
          sentryOrgSlug: input.sentryOrgSlug,
          sentryProjectSlug: input.sentryProjectSlug,
          autoRepairEnabled: input.autoRepairEnabled,
          autoRepairRules: input.autoRepairRules
            ? (input.autoRepairRules as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          verificationCmds: input.verificationCmds,
        },
      })

      return mapRepository(record)
    },
    async list() {
      const records = await client.repository.findMany({
        orderBy: {
          name: 'asc',
        },
      })

      return records.map(mapRepository)
    },
    async findById(id: string) {
      const record = await client.repository.findUnique({
        where: {
          id,
        },
      })

      return record ? mapRepository(record) : undefined
    },
  }
}

export function createPrismaIssueStore(client = getDbClient()): IssueStore & {
  findById(id: string): Promise<IssueRecord | undefined>
} {
  return {
    async list() {
      const records = await client.issue.findMany({
        orderBy: {
          lastSeenAt: 'desc',
        },
      })

      return records.map(mapIssue)
    },
    async upsert(input: IssueRecord) {
      const record = await client.issue.upsert({
        where: {
          repositoryId_externalIssueId: {
            repositoryId: input.repositoryId,
            externalIssueId: input.externalIssueId,
          },
        },
        update: {
          title: input.title,
          culprit: input.culprit,
          level: input.level,
        },
        create: {
          id: input.id,
          repositoryId: input.repositoryId,
          externalIssueId: input.externalIssueId,
          title: input.title,
          culprit: input.culprit,
          level: input.level,
          status: input.status,
        },
      })

      return mapIssue(record)
    },
    async updateStatus(id: string, status: IssueRecord['status']) {
      const record = await client.issue.update({
        where: {
          id,
        },
        data: {
          status,
        },
      })

      return mapIssue(record)
    },
    async findById(id: string) {
      const record = await client.issue.findUnique({
        where: {
          id,
        },
      })

      return record ? mapIssue(record) : undefined
    },
    async findByExternalIssueId(repositoryId: string, externalIssueId: string) {
      const record = await client.issue.findUnique({
        where: {
          repositoryId_externalIssueId: {
            repositoryId,
            externalIssueId,
          },
        },
      })

      return record ? mapIssue(record) : undefined
    },
    async findOpenPrByExternalIssueId(repositoryId: string, externalIssueId: string) {
      const record = await client.issue.findFirst({
        where: {
          repositoryId,
          externalIssueId,
          status: 'pr_opened',
        },
        select: {
          id: true,
        },
      })

      return Boolean(record)
    },
  }
}

export function createPrismaAnalysisRunStore(client = getDbClient()) {
  return {
    async create(input: {
      issueId: string
      status: AnalysisRunStatus
    }) {
      const record = await client.analysisRun.create({
        data: {
          issueId: input.issueId,
          status: input.status,
        },
      })

      return mapAnalysisRun(record)
    },
    async update(id: string, input: {
      status: AnalysisRunStatus
      summary?: string
      rootCause?: string
      patchBranch?: string
      prUrl?: string
      confidence?: number
      verification?: VerificationRecord[]
    }) {
      const record = await client.analysisRun.update({
        where: {
          id,
        },
        data: {
          status: input.status,
          summary: input.summary,
          rootCause: input.rootCause,
          patchBranch: input.patchBranch,
          prUrl: input.prUrl,
          confidence: input.confidence,
          verification: input.verification ? (input.verification as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      })

      return mapAnalysisRun(record)
    },
    async updateByIssueId(issueId: string, input: {
      status: AnalysisRunStatus
      summary?: string
      rootCause?: string
      patchBranch?: string
      prUrl?: string
      confidence?: number
      verification?: VerificationRecord[]
    }) {
      const latest = await client.analysisRun.findFirst({
        where: {
          issueId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      if (!latest) {
        throw new Error(`AnalysisRun not found for issue: ${issueId}`)
      }

      return this.update(latest.id, input)
    },
    async findLatestByIssueId(issueId: string) {
      const record = await client.analysisRun.findFirst({
        where: {
          issueId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return record ? mapAnalysisRun(record) : undefined
    },
  }
}
