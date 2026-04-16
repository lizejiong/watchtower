import { afterEach, describe, expect, it } from 'vitest'
import { getAiProviderConfig } from './config.js'
import { createAiProvider } from './factory.js'

const originalEnv = {
  AI_MODEL: process.env.AI_MODEL,
  AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
}

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key]
      continue
    }

    process.env[key] = value
  }
})

describe('getAiProviderConfig', () => {
  it('reads gateway model config from environment', () => {
    process.env.AI_MODEL = 'zai/glm-5'
    process.env.AI_GATEWAY_API_KEY = 'test-gateway-key'

    expect(getAiProviderConfig()).toEqual({
      provider: 'gateway',
      model: 'zai/glm-5',
      apiKey: 'test-gateway-key',
    })
  })
})

describe('createAiProvider', () => {
  it('creates a gateway-backed provider client from environment config', () => {
    process.env.AI_MODEL = 'zai/glm-5'
    process.env.AI_GATEWAY_API_KEY = 'test-gateway-key'

    const provider = createAiProvider()

    expect(provider.provider).toBe('gateway')
    expect(provider.model).toBe('zai/glm-5')
    expect(typeof provider.generateStructured).toBe('function')
  })
})
