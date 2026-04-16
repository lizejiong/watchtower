import { describe, expect, it, vi } from 'vitest'
import { createSentryClient } from './client.js'

describe('createSentryClient', () => {
  it('lists unresolved project issues and maps the sentry payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          id: 'issue-123',
          title: 'Chat route crashes on missing thread_id',
          culprit: 'app/api/chat/route.ts',
          level: 'error',
          project: {
            slug: 'ai-code-web',
          },
        },
      ],
    }))

    const client = createSentryClient({
      token: 'test-token',
      baseUrl: 'https://sentry.example.com',
      fetch: fetchMock as unknown as typeof fetch,
    })

    const issues = await client.listProjectIssues({
      orgSlug: 'lizejiong',
      projectSlug: 'ai-code-web',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://sentry.example.com/api/0/projects/lizejiong/ai-code-web/issues/?query=is%3Aunresolved',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer test-token',
        }),
      }),
    )
    expect(issues).toEqual([
      {
        id: 'issue-123',
        title: 'Chat route crashes on missing thread_id',
        culprit: 'app/api/chat/route.ts',
        level: 'error',
        projectSlug: 'ai-code-web',
      },
    ])
  })
})
