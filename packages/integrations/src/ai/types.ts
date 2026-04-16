import type { ZodType } from 'zod'

export type AiProviderName = 'gateway'

export interface AiProviderConfig {
  provider: AiProviderName
  model: string
  apiKey: string
}

export interface StructuredGenerationInput<T> {
  prompt: string
  schema: ZodType<T>
}

export interface AiProviderLike {
  provider: AiProviderName
  model: string
  generateStructured<T>(input: StructuredGenerationInput<T>): Promise<T>
}
