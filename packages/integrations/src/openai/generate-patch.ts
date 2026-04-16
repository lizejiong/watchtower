import type { GeneratedPatch, PatchGenerationInput } from '@watchtower/core'
import { buildPatchGenerationPrompt, generatedPatchJsonSchema, generatedPatchSchema } from '@watchtower/core'
import type { OpenAiResponsesClientLike } from './analyze-issue.js'
import { createOpenAiClient } from './client.js'

function extractOutputText(response: {
  output_text?: string
  output?: Array<{
    content?: Array<{
      text?: string
    }>
  }>
}) {
  if (response.output_text) {
    return response.output_text
  }

  return response.output?.flatMap(item => item.content ?? []).map(item => item.text ?? '').join('').trim() ?? ''
}

export async function generatePatch(
  input: PatchGenerationInput,
  client: OpenAiResponsesClientLike = createOpenAiClient() as unknown as OpenAiResponsesClientLike,
): Promise<GeneratedPatch> {
  const prompt = buildPatchGenerationPrompt(input)

  const response = await client.responses.create({
    model: 'gpt-5.4',
    input: prompt,
    text: {
      format: {
        type: 'json_schema',
        name: 'generated_patch',
        schema: generatedPatchJsonSchema,
      },
    },
  })

  const outputText = extractOutputText(response)
  const parsed = JSON.parse(outputText)
  return generatedPatchSchema.parse(parsed)
}
