import { describe, expect, it } from 'vitest'
import { issueStatusSchema } from '@watchtower/contracts'

describe('issue status schema', () => {
  it('accepts the MVP states', () => {
    expect(issueStatusSchema.parse('new')).toBe('new')
    expect(issueStatusSchema.parse('pr_opened')).toBe('pr_opened')
  })
})
