import OpenAI from 'openai'

export function createOpenAiClient(apiKey = process.env.OPENAI_API_KEY) {
  return new OpenAI({ apiKey })
}
