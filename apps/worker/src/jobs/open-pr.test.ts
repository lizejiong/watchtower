import { describe, expect, it, vi } from 'vitest'
import { openPrJob } from './open-pr.js'

describe('openPrJob', () => {
  it('marks the issue as verification_failed when the gate does not pass', async () => {
    const result = await openPrJob({
      issue: {
        id: 'issue-1',
        title: 'Chat route crashes on missing thread',
      },
      repository: {
        remoteUrl: 'https://github.com/lzj2000/ai-code.git',
        defaultBranch: 'main',
      },
      branchName: 'watchtower/issue-1',
      summary: 'Missing validation before stream setup',
      sentryIssueUrl: 'https://sentry.io/issues/123',
      verification: [
        { command: 'pnpm lint', exitCode: 0, stdout: '', stderr: '' },
        { command: 'pnpm build', exitCode: 1, stdout: '', stderr: 'boom' },
      ],
    })

    expect(result.status).toBe('verification_failed')
    expect(result.prUrl).toBeUndefined()
  })

  it('opens a draft PR when verification passes', async () => {
    const openDraftPr = vi.fn(async () => ({
      number: 7,
      htmlUrl: 'https://github.com/lzj2000/ai-code/pull/7',
    }))

    const result = await openPrJob({
      issue: {
        id: 'issue-1',
        title: 'Chat route crashes on missing thread',
      },
      repository: {
        remoteUrl: 'https://github.com/lzj2000/ai-code.git',
        defaultBranch: 'main',
      },
      branchName: 'watchtower/issue-1',
      summary: 'Missing validation before stream setup',
      sentryIssueUrl: 'https://sentry.io/issues/123',
      verification: [
        { command: 'pnpm lint', exitCode: 0, stdout: '', stderr: '' },
        { command: 'pnpm build', exitCode: 0, stdout: '', stderr: '' },
      ],
      openDraftPr,
    })

    expect(result.status).toBe('pr_opened')
    expect(result.prUrl).toBe('https://github.com/lzj2000/ai-code/pull/7')
    expect(openDraftPr).toHaveBeenCalledTimes(1)
  })
})
