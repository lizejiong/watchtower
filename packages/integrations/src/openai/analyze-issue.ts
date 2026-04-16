import type { AnalysisResult, IssueAnalysisInput } from '@watchtower/core'
import { analysisResultSchema, buildIssueAnalysisPrompt } from '@watchtower/core'
import { createAiProvider } from '../ai/factory.js'
import type { AiProviderLike } from '../ai/types.js'

export async function analyzeIssue(
  input: IssueAnalysisInput,
  client: AiProviderLike = createAiProvider(),
): Promise<AnalysisResult> {
  const prompt = buildIssueAnalysisPrompt(input)
  const result = await client.generateStructured({
    prompt,
    schema: analysisResultSchema,
  })

  return analysisResultSchema.parse(result)
}
