import { z } from 'zod'

export const generatedPatchSchema = z.object({
  summary: z.string().min(1),
  branchName: z.string().min(1),
  commitMessage: z.string().min(1),
  diff: z.string().min(1),
})

export type GeneratedPatchSchema = z.infer<typeof generatedPatchSchema>

export const generatedPatchJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'branchName', 'commitMessage', 'diff'],
  properties: {
    summary: { type: 'string' },
    branchName: { type: 'string' },
    commitMessage: { type: 'string' },
    diff: { type: 'string' },
  },
} as const
