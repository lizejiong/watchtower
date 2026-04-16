import { describe, expect, it } from 'vitest'
import type { AiProviderLike } from '../ai/types.js'
import { generatePatch } from './generate-patch.js'

describe('generatePatch', () => {
  it('parses structured patch output from the AI provider facade', async () => {
    const provider: AiProviderLike = {
      provider: 'gateway',
      model: 'openai/gpt-5.4',
      generateStructured: async <T>() =>
        ({
          summary: 'Guard missing thread_id in chat route',
          branchName: 'watchtower/issue-1',
          commitMessage: 'fix: guard missing thread_id in chat route',
          diff: 'diff --git a/app/api/chat/route.ts b/app/api/chat/route.ts\n',
        }) as T,
    }

    const result = await generatePatch(
      {
        repository: {
          id: 'repo-1',
          name: 'ai-code',
          localPath: 'C:\\Users\\48150\\Desktop\\mycode\\ai-code',
          defaultBranch: 'main',
        },
        issue: {
          id: 'issue-1',
          title: 'Chat route crash',
          culprit: 'app/api/chat/route.ts',
          level: 'error',
        },
        analysis: {
          summary: 'Null access in chat route',
          rootCause: 'thread_id is used before validation',
          suspectFiles: ['app/api/chat/route.ts'],
          fixable: true,
          confidence: 0.82,
          fixPlan: ['Guard missing thread_id', 'Add route-level error handling'],
          verificationPlan: ['pnpm lint', 'pnpm build'],
        },
        codeContext: [
          {
            path: 'app/api/chat/route.ts',
            content: 'export async function POST() { return Response.json({ ok: true }) }\n',
          },
        ],
      },
      provider,
    )

    expect(result.branchName).toBe('watchtower/issue-1')
    expect(result.diff).toContain('diff --git')
  })
})
