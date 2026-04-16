import type { AnalysisResult, IssueAnalysisInput } from '@watchtower/core'
import { analysisResultJsonSchema, analysisResultSchema, buildIssueAnalysisPrompt } from '@watchtower/core'
import { createOpenAiClient } from './client.js'

export interface OpenAiResponsesClientLike {
  responses: {
    create: (input: Record<string, unknown>) => Promise<{
      output_text?: string
      output?: Array<{
        content?: Array<{
          text?: string
        }>
      }>
    }>
  }
}

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

export async function analyzeIssue(
  input: IssueAnalysisInput,
  client: OpenAiResponsesClientLike = createOpenAiClient() as unknown as OpenAiResponsesClientLike,
): Promise<AnalysisResult> {
  const prompt = buildIssueAnalysisPrompt(input)

  const response = await client.responses.create({
    model: 'gpt-5.4',
    input: prompt,
    text: {
      format: {
        type: 'json_schema',
        name: 'analysis_result',
        schema: analysisResultJsonSchema,
      },
    },
  })

  const outputText = extractOutputText(response)
  const parsed = JSON.parse(outputText)
  return analysisResultSchema.parse(parsed)
}
