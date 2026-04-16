import type { GeneratedPatch, PatchGenerationInput } from '@watchtower/core'
import { buildPatchGenerationPrompt, generatedPatchSchema } from '@watchtower/core'
import { createAiProvider } from '../ai/factory.js'
import type { AiProviderLike } from '../ai/types.js'

export async function generatePatch(
  input: PatchGenerationInput,
  client: AiProviderLike = createAiProvider(),
): Promise<GeneratedPatch> {
  const prompt = buildPatchGenerationPrompt(input)
  const result = await client.generateStructured({
    prompt,
    schema: generatedPatchSchema,
  })

  return generatedPatchSchema.parse(result)
}
