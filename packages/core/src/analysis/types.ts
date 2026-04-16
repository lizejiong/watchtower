export interface AnalysisResult {
  summary: string
  rootCause: string
  suspectFiles: string[]
  fixable: boolean
  confidence: number
  fixPlan: string[]
  verificationPlan: string[]
}

export interface IssueAnalysisInput {
  issue: {
    id: string
    title: string
    culprit?: string
    level?: string
  }
  event: Record<string, unknown>
  repository: {
    id: string
    name: string
    localPath: string
    defaultBranch: string
  }
}
