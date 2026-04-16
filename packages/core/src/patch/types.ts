import type { AnalysisResult, IssueAnalysisInput } from '../analysis/types.js'

export interface PatchCodeContextFile {
  path: string
  content: string
}

export interface PatchGenerationInput {
  repository: IssueAnalysisInput['repository']
  issue: IssueAnalysisInput['issue']
  analysis: AnalysisResult
  codeContext: PatchCodeContextFile[]
}

export interface GeneratedPatch {
  summary: string
  branchName: string
  commitMessage: string
  diff: string
}
