import { describe, expect, it } from 'vitest'
import { buildPullRequestBody, openDraftPullRequest } from './open-draft-pr.js'

describe('buildPullRequestBody', () => {
  it('includes issue, analysis, and verification summary', () => {
    const body = buildPullRequestBody({
      issueTitle: 'Chat route crashes on missing thread',
      sentryIssueUrl: 'https://sentry.io/issues/123',
      summary: 'Missing validation before stream setup',
      verification: [
        { command: 'pnpm lint', exitCode: 0, stdout: '', stderr: '' },
        { command: 'pnpm build', exitCode: 0, stdout: '', stderr: '' },
      ],
    })

    expect(body).toContain('Sentry Issue')
    expect(body).toContain('Verification')
    expect(body).toContain('pnpm build')
  })
})

describe('openDraftPullRequest', () => {
  it('submits a draft PR to the GitHub client', async () => {
    const result = await openDraftPullRequest(
      {
        issueTitle: 'Chat route crashes on missing thread',
        sentryIssueUrl: 'https://sentry.io/issues/123',
        summary: 'Missing validation before stream setup',
        repository: {
          remoteUrl: 'https://github.com/lzj2000/ai-code.git',
          defaultBranch: 'main',
        },
        branchName: 'watchtower/issue-123',
        verification: [
          { command: 'pnpm lint', exitCode: 0, stdout: '', stderr: '' },
          { command: 'pnpm build', exitCode: 0, stdout: '', stderr: '' },
        ],
      },
      {
        createDraftPullRequest: async input => ({
          number: 42,
          htmlUrl: `https://github.com/${input.owner}/${input.repo}/pull/42`,
        }),
      },
    )

    expect(result.number).toBe(42)
    expect(result.htmlUrl).toContain('/pull/42')
  })
})
