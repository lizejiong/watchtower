import type { DraftPullRequest, VerificationRecord } from '@watchtower/contracts'
import { nextIssueState } from '@watchtower/core'
import { openDraftPullRequest } from '@watchtower/integrations'

export async function openPrJob(input: {
  issue: {
    id: string
    title: string
  }
  repository: {
    remoteUrl: string
    defaultBranch: string
  }
  branchName: string
  summary: string
  sentryIssueUrl: string
  verification: VerificationRecord[]
  openDraftPr?: (input: {
    issueTitle: string
    sentryIssueUrl: string
    summary: string
    repository: {
      remoteUrl: string
      defaultBranch: string
    }
    branchName: string
    verification: VerificationRecord[]
  }) => Promise<DraftPullRequest>
}) {
  if (input.verification.some(record => record.exitCode !== 0)) {
    return {
      issueId: input.issue.id,
      status: nextIssueState('fix_suggested', 'verification_failed'),
      verification: input.verification,
    }
  }

  const pr = await (input.openDraftPr ?? openDraftPullRequest)({
    issueTitle: input.issue.title,
    sentryIssueUrl: input.sentryIssueUrl,
    summary: input.summary,
    repository: input.repository,
    branchName: input.branchName,
    verification: input.verification,
  })

  return {
    issueId: input.issue.id,
    status: nextIssueState('fix_suggested', 'pr_opened'),
    prNumber: pr.number,
    prUrl: pr.htmlUrl,
    verification: input.verification,
  }
}
