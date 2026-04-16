import type { IssueAnalysisInput } from './types.js'

export function buildIssueAnalysisPrompt(input: IssueAnalysisInput) {
  return [
    'You are analyzing a Sentry issue for automatic repair.',
    `Repository: ${input.repository.name}`,
    `Default branch: ${input.repository.defaultBranch}`,
    `Issue id: ${input.issue.id}`,
    `Issue title: ${input.issue.title}`,
    `Issue culprit: ${input.issue.culprit ?? 'unknown'}`,
    `Issue level: ${input.issue.level ?? 'unknown'}`,
    'Return only structured JSON matching the required schema.',
  ].join('\n')
}
