import { syncIssueJob, type AnalysisQueueLike, type IssueStore, type RepositoryStore } from '@watchtower/core'
import type { SentryIssuesClientLike } from '@watchtower/integrations'

export async function pollSentryIssues(input: {
  repositoryStore: RepositoryStore
  issueStore: IssueStore
  analysisQueue: AnalysisQueueLike
  sentryClient: SentryIssuesClientLike
}) {
  const repositories = await input.repositoryStore.list()
  let syncedIssues = 0

  for (const repository of repositories) {
    const issues = await input.sentryClient.listProjectIssues({
      orgSlug: repository.sentryOrgSlug,
      projectSlug: repository.sentryProjectSlug,
    })

    for (const issue of issues) {
      await syncIssueJob(
        {
          action: 'triggered',
          data: {
            issue: {
              id: issue.id,
              title: issue.title,
              culprit: issue.culprit,
              level: issue.level,
              projectSlug: issue.projectSlug,
            },
          },
        },
        {
          repositoryStore: input.repositoryStore,
          issueStore: input.issueStore,
          analysisQueue: input.analysisQueue,
        },
      )
      syncedIssues += 1
    }
  }

  return {
    repositories: repositories.length,
    syncedIssues,
  }
}
