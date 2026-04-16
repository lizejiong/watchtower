import { describe, expect, it, vi } from 'vitest'
import type { IssueRecord, RepositoryRecord } from '@watchtower/core'
import { pollSentryIssues } from './poller.js'

function createRepository(overrides: Partial<RepositoryRecord> = {}): RepositoryRecord {
  return {
    id: 'repo-ai-code',
    name: 'ai-code',
    localPath: 'C:\\Users\\48150\\Desktop\\mycode\\ai-code',
    remoteUrl: 'https://github.com/lzj2000/ai-code.git',
    defaultBranch: 'main',
    provider: 'github',
    sentryOrgSlug: 'lizejiong',
    sentryProjectSlug: 'ai-code-web',
    autoRepairEnabled: true,
    autoRepairRules: { minLevel: 'error' },
    verificationCmds: ['pnpm lint', 'pnpm build'],
    ...overrides,
  }
}

describe('pollSentryIssues', () => {
  it('syncs unresolved sentry issues into the existing issue pipeline', async () => {
    const repositories = [createRepository()]
    const issues = new Map<string, IssueRecord>()
    const analysisQueue = {
      add: vi.fn(async () => undefined),
    }
    const sentryClient = {
      listProjectIssues: vi.fn(async () => [
        {
          id: 'issue-123',
          title: 'Chat route crash',
          culprit: 'app/api/chat/route.ts',
          level: 'error',
          projectSlug: 'ai-code-web',
        },
      ]),
    }

    await pollSentryIssues({
      repositoryStore: {
        list: async () => repositories,
      },
      issueStore: {
        list: async () => Array.from(issues.values()),
        findByExternalIssueId: async (repositoryId, externalIssueId) =>
          Array.from(issues.values()).find(
            issue => issue.repositoryId === repositoryId && issue.externalIssueId === externalIssueId,
          ),
        upsert: async (input) => {
          issues.set(input.id, input)
          return input
        },
        updateStatus: async (id, status) => {
          const current = issues.get(id)!
          const updated = { ...current, status }
          issues.set(id, updated)
          return updated
        },
        findOpenPrByExternalIssueId: async () => false,
      },
      analysisQueue,
      sentryClient,
    })

    await pollSentryIssues({
      repositoryStore: {
        list: async () => repositories,
      },
      issueStore: {
        list: async () => Array.from(issues.values()),
        findByExternalIssueId: async (repositoryId, externalIssueId) =>
          Array.from(issues.values()).find(
            issue => issue.repositoryId === repositoryId && issue.externalIssueId === externalIssueId,
          ),
        upsert: async (input) => {
          issues.set(input.id, input)
          return input
        },
        updateStatus: async (id, status) => {
          const current = issues.get(id)!
          const updated = { ...current, status }
          issues.set(id, updated)
          return updated
        },
        findOpenPrByExternalIssueId: async () => false,
      },
      analysisQueue,
      sentryClient,
    })

    expect(sentryClient.listProjectIssues).toHaveBeenCalledWith({
      orgSlug: 'lizejiong',
      projectSlug: 'ai-code-web',
    })
    expect(analysisQueue.add).toHaveBeenCalledTimes(1)
    expect(Array.from(issues.values())).toHaveLength(1)
    expect(Array.from(issues.values())[0]?.status).toBe('queued')
  })
})
