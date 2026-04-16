import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from '../app.js'

describe('GET /issues/:issueId', () => {
  it('returns the issue with the latest analysis summary', async () => {
    const app = await buildApp()
    const repository = await app.repositoryStore.create({
      name: 'ai-code',
      localPath: 'C:\\Users\\48150\\Desktop\\mycode\\ai-code',
      remoteUrl: 'https://github.com/lzj2000/ai-code.git',
      defaultBranch: 'main',
      provider: 'github',
      sentryOrgSlug: 'demo-org',
      sentryProjectSlug: 'ai-code-web',
      autoRepairEnabled: true,
      autoRepairRules: {
        minLevel: 'error',
      },
      verificationCmds: ['pnpm lint', 'pnpm build'],
    })

    const issue = await app.issueStore.upsert({
      id: `${repository.id}:issue-123`,
      repositoryId: repository.id,
      externalIssueId: 'issue-123',
      title: 'Chat route crashes on missing thread_id',
      culprit: 'app/api/chat/route.ts',
      level: 'error',
      status: 'pr_opened',
    })

    await app.analysisRunStore.create({
      issueId: issue.id,
      status: 'running',
    })

    await app.analysisRunStore.updateByIssueId(issue.id, {
      status: 'completed',
      summary: 'Guard missing thread_id before stream setup.',
      rootCause: 'thread_id is used without validation.',
      patchBranch: 'watchtower/issue-123',
      prUrl: 'https://github.com/lzj2000/ai-code/pull/7',
      confidence: 0.91,
      verification: [
        { command: 'pnpm lint', exitCode: 0, stdout: '', stderr: '' },
      ],
    })

    const response = await app.inject({
      method: 'GET',
      url: `/issues/${issue.id}`,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: issue.id,
        latestAnalysis: expect.objectContaining({
          status: 'completed',
          summary: 'Guard missing thread_id before stream setup.',
          prUrl: 'https://github.com/lzj2000/ai-code/pull/7',
        }),
      }),
    )
  })

  afterAll(async () => {
    const app = await buildApp()
    await app.close()
  })
})
