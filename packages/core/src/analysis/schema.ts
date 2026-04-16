import { z } from 'zod'

export const analysisResultSchema = z.object({
  summary: z.string().min(1),
  rootCause: z.string().min(1),
  suspectFiles: z.array(z.string()).min(1),
  fixable: z.boolean(),
  confidence: z.number().min(0).max(1),
  fixPlan: z.array(z.string()).min(1),
  verificationPlan: z.array(z.string()).min(1),
})

export const analysisResultJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'rootCause',
    'suspectFiles',
    'fixable',
    'confidence',
    'fixPlan',
    'verificationPlan',
  ],
  properties: {
    summary: { type: 'string', minLength: 1 },
    rootCause: { type: 'string', minLength: 1 },
    suspectFiles: {
      type: 'array',
      minItems: 1,
      items: { type: 'string' },
    },
    fixable: { type: 'boolean' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    fixPlan: {
      type: 'array',
      minItems: 1,
      items: { type: 'string' },
    },
    verificationPlan: {
      type: 'array',
      minItems: 1,
      items: { type: 'string' },
    },
  },
} as const
