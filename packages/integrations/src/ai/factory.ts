import { gateway, generateObject } from 'ai'
import { getAiProviderConfig } from './config.js'
import type { AiProviderConfig, AiProviderLike } from './types.js'

export function createAiProvider(config: AiProviderConfig = getAiProviderConfig()): AiProviderLike {
  return {
    provider: 'gateway',
    model: config.model,
    async generateStructured(input) {
      const result = await generateObject({
        model: gateway(config.model),
        prompt: input.prompt,
        schema: input.schema,
      })

      return input.schema.parse(result.object)
    },
  }
}
