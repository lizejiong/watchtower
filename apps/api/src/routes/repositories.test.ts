import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from '../app.js'

describe('POST /repositories', () => {
  it('creates a repository config', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/repositories',
      payload: {
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
          allowFrameworks: ['nextjs'],
        },
        verificationCmds: ['pnpm lint', 'pnpm build'],
      },
    })

    expect(response.statusCode).toBe(201)
  })

  afterAll(async () => {
    const app = await buildApp()
    await app.close()
  })
})
