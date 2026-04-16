import { describe, expect, it } from 'vitest'
import { analysisResultSchema } from './schema.js'

describe('analysisResultSchema', () => {
  it('requires suspect files and a fixability decision', () => {
    const parsed = analysisResultSchema.parse({
      summary: 'Null access in chat route',
      rootCause: 'thread_id is used before validation',
      suspectFiles: ['app/api/chat/route.ts'],
      fixable: true,
      confidence: 0.82,
      fixPlan: ['Guard missing thread_id', 'Add route-level error handling'],
      verificationPlan: ['pnpm lint', 'pnpm build'],
    })

    expect(parsed.fixable).toBe(true)
  })
})
