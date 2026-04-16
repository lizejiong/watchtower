import { describe, expect, it } from 'vitest'
import { issueStatusSchema } from './issues.js'
import { repositoryCreateSchema } from './repositories.js'

describe('issueStatusSchema', () => {
  it('accepts the MVP issue states', () => {
    expect(issueStatusSchema.parse('new')).toBe('new')
    expect(issueStatusSchema.parse('pr_opened')).toBe('pr_opened')
  })
})

describe('repositoryCreateSchema', () => {
  it('requires the ai-code verification gate', () => {
    const parsed = repositoryCreateSchema.parse({
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
    })

    expect(parsed.verificationCmds).toEqual(['pnpm lint', 'pnpm build'])
  })
})
