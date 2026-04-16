import { z } from 'zod'

export const analysisRunStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
])

export type AnalysisRunStatus = z.infer<typeof analysisRunStatusSchema>
