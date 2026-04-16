import type { DraftPullRequest, VerificationRecord } from '@watchtower/contracts'
import { createGitHubClient, type GitHubPullRequestClientLike } from './client.js'

function parseGitHubRemoteUrl(remoteUrl: string) {
  const normalized = remoteUrl.replace(/\.git$/, '')
  const httpsMatch = normalized.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/i)
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2],
    }
  }

  const sshMatch = normalized.match(/^git@github\.com:([^/]+)\/([^/]+)$/i)
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
    }
  }

  throw new Error(`Unsupported GitHub remote URL: ${remoteUrl}`)
}

function formatVerificationLine(record: VerificationRecord) {
  const status = record.exitCode === 0 ? 'passed' : 'failed'
  return `- \`${record.command}\`: ${status} (${record.exitCode})`
}

export function buildPullRequestBody(input: {
  issueTitle: string
  sentryIssueUrl: string
  summary: string
  verification: VerificationRecord[]
}) {
  return [
    '## Sentry Issue',
    `- [${input.issueTitle}](${input.sentryIssueUrl})`,
    '',
    '## AI Summary',
    input.summary,
    '',
    '## Verification',
    ...input.verification.map(formatVerificationLine),
  ].join('\n')
}

export async function openDraftPullRequest(
  input: {
    issueTitle: string
    sentryIssueUrl: string
    summary: string
    repository: {
      remoteUrl: string
      defaultBranch: string
    }
    branchName: string
    verification: VerificationRecord[]
  },
  client: GitHubPullRequestClientLike = createGitHubClient(),
): Promise<DraftPullRequest> {
  const target = parseGitHubRemoteUrl(input.repository.remoteUrl)
  const body = buildPullRequestBody({
    issueTitle: input.issueTitle,
    sentryIssueUrl: input.sentryIssueUrl,
    summary: input.summary,
    verification: input.verification,
  })

  return client.createDraftPullRequest({
    owner: target.owner,
    repo: target.repo,
    title: `fix: ${input.issueTitle}`,
    head: input.branchName,
    base: input.repository.defaultBranch,
    body,
  })
}
