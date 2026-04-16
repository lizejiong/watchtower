import type { AnalysisResult, IssueAnalysisInput } from '@watchtower/core'
import { nextIssueState } from '@watchtower/core'
import { analyzeIssue } from '@watchtower/integrations'

export async function analyzeIssueJob(input: {
  issueId: string
  context: IssueAnalysisInput
  analyze?: (context: IssueAnalysisInput) => Promise<AnalysisResult>
}) {
  const analysis = await (input.analyze ?? analyzeIssue)(input.context)

  return {
    issueId: input.issueId,
    status: nextIssueState('analyzing', 'analysis_succeeded'),
    analysis,
  }
}
