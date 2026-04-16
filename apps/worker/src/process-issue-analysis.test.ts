import { describe, expect, it, vi } from 'vitest'
import type { IssueRecord, RepositoryRecord } from '@watchtower/core'
import { processIssueAnalysis } from './process-issue-analysis.js'

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

function createIssue(overrides: Partial<IssueRecord> = {}): IssueRecord {
  return {
    id: 'repo-ai-code:issue-123',
    repositoryId: 'repo-ai-code',
    externalIssueId: 'issue-123',
    title: 'Chat route crashes on missing thread_id',
    culprit: 'app/api/chat/route.ts',
    level: 'error',
    status: 'queued',
    ...overrides,
  }
}

describe('processIssueAnalysis', () => {
  it('runs analysis, verification, and draft PR opening for a queued issue', async () => {
    const issue = createIssue()
    const repository = createRepository()
    const updatedStatuses: string[] = []
    const cleanupPatchWorkspace = vi.fn(async () => undefined)
    const createPatchWorkspace = vi.fn(async () => ({
      branchName: 'watchtower/issue-123',
      worktreePath: 'C:\\temp\\watchtower-worktree-123',
      cleanup: cleanupPatchWorkspace,
    }))
    const applyPatch = vi.fn(async () => undefined)
    const commitAndPushBranch = vi.fn(async () => undefined)
    const openDraftPr = vi.fn(async () => ({
      number: 7,
      htmlUrl: 'https://github.com/lzj2000/ai-code/pull/7',
    }))

    const result = await processIssueAnalysis(
      {
        issueId: issue.id,
      },
      {
        issueStore: {
          findById: async () => issue,
          updateStatus: async (issueId, status) => {
            updatedStatuses.push(`${issueId}:${status}`)
            return { ...issue, status }
          },
        },
        repositoryStore: {
          findById: async () => repository,
        },
        loadCodeContext: async () => [
          {
            path: 'app/api/chat/route.ts',
            content: 'export async function POST() { return Response.json({ ok: true }) }\n',
          },
        ],
        analyzeIssue: async () => ({
          issueId: issue.id,
          status: 'fix_suggested',
          analysis: {
            summary: 'Guard missing thread_id before stream setup.',
            rootCause: 'thread_id is used without validation.',
            suspectFiles: ['app/api/chat/route.ts'],
            fixable: true,
            confidence: 0.9,
            fixPlan: ['Add a missing validation guard'],
            verificationPlan: ['pnpm lint', 'pnpm build'],
          },
          patch: {
            summary: 'Guard missing thread_id before stream setup.',
            branchName: 'watchtower/issue-123',
            commitMessage: 'fix: guard missing thread_id',
            diff: 'diff --git a/app/api/chat/route.ts b/app/api/chat/route.ts\n',
          },
        }),
        createPatchWorkspace,
        applyPatch,
        verifyFix: async () => ({
          ok: true,
          records: [
            { command: 'pnpm lint', exitCode: 0, stdout: '', stderr: '' },
            { command: 'pnpm build', exitCode: 0, stdout: '', stderr: '' },
          ],
        }),
        commitAndPushBranch,
        openDraftPr,
      },
    )

    expect(updatedStatuses).toEqual([
      `${issue.id}:analyzing`,
      `${issue.id}:fix_suggested`,
      `${issue.id}:pr_opened`,
    ])
    expect(createPatchWorkspace).toHaveBeenCalledWith({
      repoPath: repository.localPath,
      branchName: 'watchtower/issue-123',
      baseBranch: repository.defaultBranch,
    })
    expect(applyPatch).toHaveBeenCalledWith(
      'C:\\temp\\watchtower-worktree-123',
      'diff --git a/app/api/chat/route.ts b/app/api/chat/route.ts\n',
    )
    expect(commitAndPushBranch).toHaveBeenCalledWith({
      repoPath: 'C:\\temp\\watchtower-worktree-123',
      branchName: 'watchtower/issue-123',
      commitMessage: 'fix: guard missing thread_id',
    })
    expect(openDraftPr).toHaveBeenCalledTimes(1)
    expect(cleanupPatchWorkspace).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('pr_opened')
  })

  it('discards local patch changes when verification fails', async () => {
    const issue = createIssue()
    const repository = createRepository()
    const cleanupPatchWorkspace = vi.fn(async () => undefined)
    const createPatchWorkspace = vi.fn(async () => ({
      branchName: 'watchtower/issue-123',
      worktreePath: 'C:\\temp\\watchtower-worktree-123',
      cleanup: cleanupPatchWorkspace,
    }))
    const discardLocalChanges = vi.fn(async () => undefined)
    const commitAndPushBranch = vi.fn(async () => undefined)
    const openDraftPr = vi.fn(async () => ({
      number: 8,
      htmlUrl: 'https://github.com/lzj2000/ai-code/pull/8',
    }))

    const result = await processIssueAnalysis(
      {
        issueId: issue.id,
      },
      {
        issueStore: {
          findById: async () => issue,
          updateStatus: async (_issueId, status) => ({ ...issue, status }),
        },
        repositoryStore: {
          findById: async () => repository,
        },
        loadCodeContext: async () => [
          {
            path: 'app/api/chat/route.ts',
            content: 'export async function POST() { return Response.json({ ok: true }) }\n',
          },
        ],
        analyzeIssue: async () => ({
          issueId: issue.id,
          status: 'fix_suggested',
          analysis: {
            summary: 'Guard missing thread_id before stream setup.',
            rootCause: 'thread_id is used without validation.',
            suspectFiles: ['app/api/chat/route.ts'],
            fixable: true,
            confidence: 0.9,
            fixPlan: ['Add a missing validation guard'],
            verificationPlan: ['pnpm lint', 'pnpm build'],
          },
          patch: {
            summary: 'Guard missing thread_id before stream setup.',
            branchName: 'watchtower/issue-123',
            commitMessage: 'fix: guard missing thread_id',
            diff: 'diff --git a/app/api/chat/route.ts b/app/api/chat/route.ts\n',
          },
        }),
        createPatchWorkspace,
        applyPatch: async () => undefined,
        verifyFix: async () => ({
          ok: false,
          records: [
            { command: 'pnpm lint', exitCode: 1, stdout: '', stderr: 'lint failed' },
          ],
        }),
        discardLocalChanges,
        commitAndPushBranch,
        openDraftPr,
      },
    )

    expect(discardLocalChanges).toHaveBeenCalledWith('C:\\temp\\watchtower-worktree-123')
    expect(commitAndPushBranch).not.toHaveBeenCalled()
    expect(openDraftPr).not.toHaveBeenCalled()
    expect(cleanupPatchWorkspace).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('verification_failed')
  })
})
