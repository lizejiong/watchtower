import { z } from 'zod'

export const issueStatusSchema = z.enum([
  'new',
  'queued',
  'auto_skipped',
  'analyzing',
  'fix_suggested',
  'verification_failed',
  'pr_opened',
  'ignored',
])

export type IssueStatus = z.infer<typeof issueStatusSchema>
