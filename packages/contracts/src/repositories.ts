import { z } from 'zod'

export const repositoryProviderSchema = z.enum([
  'github',
])

export const repositoryCreateSchema = z.object({
  name: z.string().min(1),
  localPath: z.string().min(1),
  remoteUrl: z.string().url(),
  defaultBranch: z.string().min(1),
  provider: repositoryProviderSchema,
  sentryOrgSlug: z.string().min(1),
  sentryProjectSlug: z.string().min(1),
  autoRepairEnabled: z.boolean().default(false),
  autoRepairRules: z.record(z.string(), z.unknown()).optional(),
  verificationCmds: z.array(z.string()).min(1),
})

export type RepositoryCreateInput = z.infer<typeof repositoryCreateSchema>
