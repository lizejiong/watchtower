import { z } from 'zod'

export const analysisRunStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
])

export const verificationRecordSchema = z.object({
  command: z.string().min(1),
  exitCode: z.number().int(),
  stdout: z.string(),
  stderr: z.string(),
})

export const draftPullRequestSchema = z.object({
  number: z.number().int().positive(),
  htmlUrl: z.string().url(),
})

export type AnalysisRunStatus = z.infer<typeof analysisRunStatusSchema>
export type VerificationRecord = z.infer<typeof verificationRecordSchema>
export type DraftPullRequest = z.infer<typeof draftPullRequestSchema>
