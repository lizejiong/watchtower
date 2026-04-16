import type { AiProviderConfig, AiProviderName } from './types.js'

function getRequiredValue(name: string, value: string | undefined) {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing ${name} for AI provider configuration`)
  }

  return value.trim()
}

export function getAiProviderConfig(env: NodeJS.ProcessEnv = process.env): AiProviderConfig {
  const provider = 'gateway' as AiProviderName
  const model = env.AI_MODEL?.trim() || 'zai/glm-5'

  return {
    provider,
    model,
    apiKey: getRequiredValue('AI_GATEWAY_API_KEY', env.AI_GATEWAY_API_KEY),
  }
}
