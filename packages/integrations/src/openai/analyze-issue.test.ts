import { describe, expect, it } from 'vitest'
import { analyzeIssue } from './analyze-issue.js'

describe('analyzeIssue', () => {
  it('parses structured analysis output from the OpenAI client', async () => {
    const result = await analyzeIssue(
      {
        issue: {
          id: 'issue-1',
          title: 'Chat route crash',
          culprit: 'app/api/chat/route.ts',
          level: 'error',
        },
        event: {},
        repository: {
          id: 'repo-1',
          name: 'ai-code',
          localPath: 'C:\\Users\\48150\\Desktop\\mycode\\ai-code',
          defaultBranch: 'main',
        },
      },
      {
        responses: {
          create: async () => ({
            output_text: JSON.stringify({
              summary: 'Null access in chat route',
              rootCause: 'thread_id is used before validation',
              suspectFiles: ['app/api/chat/route.ts'],
              fixable: true,
              confidence: 0.82,
              fixPlan: ['Guard missing thread_id', 'Add route-level error handling'],
              verificationPlan: ['pnpm lint', 'pnpm build'],
            }),
          }),
        },
      },
    )

    expect(result.fixable).toBe(true)
    expect(result.suspectFiles).toContain('app/api/chat/route.ts')
  })
})
