import { describe, expect, it, vi } from 'vitest'
import { syncIssueJob, type IssueRecord, type RepositoryRecord, type SentryWebhookPayload } from './sync-issue.js'

function createRepository(overrides: Partial<RepositoryRecord> = {}): RepositoryRecord {
  return {
    id: 'repo-ai-code',
    name: 'ai-code',
    localPath: 'C:\\Users\\48150\\Desktop\\mycode\\ai-code',
    remoteUrl: 'https://github.com/lzj2000/ai-code.git',
    defaultBranch: 'main',
    provider: 'github',
    sentryOrgSlug: 'demo-org',
    sentryProjectSlug: 'ai-code-web',
    autoRepairEnabled: true,
    autoRepairRules: { minLevel: 'error' },
    verificationCmds: ['pnpm lint', 'pnpm build'],
    ...overrides,
  }
}

function createPayload(overrides: Partial<SentryWebhookPayload['data']['issue']> = {}): SentryWebhookPayload {
  return {
    action: 'triggered',
    data: {
      issue: {
        id: '123',
        title: 'Chat route crash',
        culprit: 'app/api/chat/route.ts',
        level: 'error',
        projectSlug: 'ai-code-web',
        ...overrides,
      },
    },
  }
}

describe('syncIssueJob', () => {
  it('queues analysis when the issue is eligible for auto repair', async () => {
    const issues = new Map<string, IssueRecord>()
    const analysisQueue = {
      add: vi.fn(async () => undefined),
    }

    const result = await syncIssueJob(createPayload(), {
      repositoryStore: {
        list: () => [createRepository()],
      },
      issueStore: {
        list: () => Array.from(issues.values()),
        upsert: (input) => {
          issues.set(input.id, input)
          return input
        },
        updateStatus: (id, status) => {
          const current = issues.get(id)!
          const updated = { ...current, status }
          issues.set(id, updated)
          return updated
        },
        findOpenPrByExternalIssueId: () => false,
      },
      analysisQueue,
    })

    expect(result.status).toBe('queued')
    expect(analysisQueue.add).toHaveBeenCalledWith('analyze', { issueId: result.id })
  })

  it('marks issues as auto_skipped when auto repair is disabled', async () => {
    const issues = new Map<string, IssueRecord>()
    const analysisQueue = {
      add: vi.fn(async () => undefined),
    }

    const result = await syncIssueJob(createPayload(), {
      repositoryStore: {
        list: () => [createRepository({ autoRepairEnabled: false })],
      },
      issueStore: {
        list: () => Array.from(issues.values()),
        upsert: (input) => {
          issues.set(input.id, input)
          return input
        },
        updateStatus: (id, status) => {
          const current = issues.get(id)!
          const updated = { ...current, status }
          issues.set(id, updated)
          return updated
        },
        findOpenPrByExternalIssueId: () => false,
      },
      analysisQueue,
    })

    expect(result.status).toBe('auto_skipped')
    expect(analysisQueue.add).not.toHaveBeenCalled()
  })

  it('does not re-queue an issue that already exists in storage', async () => {
    const existingIssue: IssueRecord = {
      id: 'repo-ai-code:123',
      repositoryId: 'repo-ai-code',
      externalIssueId: '123',
      title: 'Chat route crash',
      culprit: 'app/api/chat/route.ts',
      level: 'error',
      status: 'queued',
    }
    const issues = new Map<string, IssueRecord>([[existingIssue.id, existingIssue]])
    const analysisQueue = {
      add: vi.fn(async () => undefined),
    }

    const result = await syncIssueJob(createPayload(), {
      repositoryStore: {
        list: () => [createRepository()],
      },
      issueStore: {
        list: () => Array.from(issues.values()),
        findByExternalIssueId: () => existingIssue,
        upsert: (input) => {
          issues.set(input.id, input)
          return input
        },
        updateStatus: (id, status) => {
          const current = issues.get(id)!
          const updated = { ...current, status }
          issues.set(id, updated)
          return updated
        },
        findOpenPrByExternalIssueId: () => false,
      },
      analysisQueue,
    })

    expect(result).toEqual(existingIssue)
    expect(analysisQueue.add).not.toHaveBeenCalled()
  })
})
