import type { AnalysisResult, GeneratedPatch, IssueAnalysisInput, PatchCodeContextFile } from '@watchtower/core'
import { nextIssueState } from '@watchtower/core'
import { analyzeIssue, generatePatch } from '@watchtower/integrations'

export async function analyzeIssueJob(input: {
  issueId: string
  context: IssueAnalysisInput
  codeContext?: PatchCodeContextFile[]
  analyze?: (context: IssueAnalysisInput) => Promise<AnalysisResult>
  createPatch?: (input: {
    repository: IssueAnalysisInput['repository']
    issue: IssueAnalysisInput['issue']
    analysis: AnalysisResult
    codeContext: PatchCodeContextFile[]
  }) => Promise<GeneratedPatch>
}) {
  const analysis = await (input.analyze ?? analyzeIssue)(input.context)
  const patch =
    analysis.fixable && input.codeContext && input.codeContext.length > 0
      ? await (input.createPatch ?? generatePatch)({
          repository: input.context.repository,
          issue: input.context.issue,
          analysis,
          codeContext: input.codeContext,
        })
      : undefined

  return {
    issueId: input.issueId,
    status: nextIssueState('analyzing', 'analysis_succeeded'),
    analysis,
    patch,
  }
}
