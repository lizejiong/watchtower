import { describe, expect, it } from 'vitest'
import { analysisRunStatusSchema, verificationRecordSchema } from './jobs.js'

describe('analysisRunStatusSchema', () => {
  it('accepts the MVP analysis lifecycle states', () => {
    expect(analysisRunStatusSchema.parse('queued')).toBe('queued')
    expect(analysisRunStatusSchema.parse('failed')).toBe('failed')
  })
})

describe('verificationRecordSchema', () => {
  it('captures command outcomes for PR gating', () => {
    const parsed = verificationRecordSchema.parse({
      command: 'pnpm build',
      exitCode: 0,
      stdout: 'ok',
      stderr: '',
    })

    expect(parsed.exitCode).toBe(0)
  })
})
