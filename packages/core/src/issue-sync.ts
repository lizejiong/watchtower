import type { IssueStatus, RepositoryCreateInput } from '@watchtower/contracts'
import { nextIssueState } from './state-machine.js'

export interface SentryWebhookPayload {
  action: string
  data: {
    issue: {
      id: string
      title?: string
      culprit?: string
      level?: string
      projectSlug?: string
    }
  }
}

export type RepositoryRecord = RepositoryCreateInput & {
  id: string
}

export interface IssueRecord {
  id: string
  repositoryId: string
  externalIssueId: string
  title: string
  culprit?: string
  level?: string
  status: IssueStatus
}

export interface RepositoryStore {
  list(): RepositoryRecord[] | Promise<RepositoryRecord[]>
}

export interface IssueStore {
  list(): IssueRecord[] | Promise<IssueRecord[]>
  upsert(input: IssueRecord): IssueRecord | Promise<IssueRecord>
  updateStatus(id: string, status: IssueStatus): IssueRecord | Promise<IssueRecord>
  findOpenPrByExternalIssueId?(repositoryId: string, externalIssueId: string): boolean | Promise<boolean>
}

export interface AnalysisQueueLike {
  add(name: string, payload: { issueId: string }): unknown | Promise<unknown>
}

const levelScore: Record<string, number> = {
  debug: 10,
  info: 20,
  warning: 30,
  error: 40,
  fatal: 50,
}

function getLevelScore(level?: string) {
  return level ? (levelScore[level] ?? 0) : 0
}

export function selectRepositoryForIssue(payload: SentryWebhookPayload, repositories: RepositoryRecord[]) {
  const projectSlug = payload.data.issue.projectSlug

  if (projectSlug) {
    const matched = repositories.find(repository => repository.sentryProjectSlug === projectSlug)
    if (matched) {
      return matched
    }
  }

  return repositories[0]
}

export async function shouldAutoRepair(input: {
  issue: IssueRecord
  repository: RepositoryRecord
  hasOpenPr?: boolean
}) {
  const { issue, repository, hasOpenPr = false } = input

  if (!repository.autoRepairEnabled) {
    return false
  }

  if (hasOpenPr) {
    return false
  }

  if (!issue.culprit) {
    return false
  }

  const minLevel = String(repository.autoRepairRules?.minLevel ?? 'error')
  if (getLevelScore(issue.level) < getLevelScore(minLevel)) {
    return false
  }

  return true
}

export async function syncIssueJob(
  payload: SentryWebhookPayload,
  deps: {
    repositoryStore: RepositoryStore
    issueStore: IssueStore
    analysisQueue: AnalysisQueueLike
  },
) {
  const repositories = await deps.repositoryStore.list()
  const repository = selectRepositoryForIssue(payload, repositories)

  if (!repository) {
    throw new Error('No repository configured for Sentry issue')
  }

  const issue = await deps.issueStore.upsert({
    id: `${repository.id}:${payload.data.issue.id}`,
    repositoryId: repository.id,
    externalIssueId: payload.data.issue.id,
    title: payload.data.issue.title ?? 'Untitled Sentry issue',
    culprit: payload.data.issue.culprit,
    level: payload.data.issue.level,
    status: 'new',
  })

  const hasOpenPr = deps.issueStore.findOpenPrByExternalIssueId
    ? await deps.issueStore.findOpenPrByExternalIssueId(repository.id, issue.externalIssueId)
    : false

  if (!(await shouldAutoRepair({ issue, repository, hasOpenPr }))) {
    return deps.issueStore.updateStatus(issue.id, nextIssueState('new', 'auto_skipped'))
  }

  const queuedIssue = await deps.issueStore.updateStatus(issue.id, nextIssueState('new', 'queued'))
  await deps.analysisQueue.add('analyze', { issueId: queuedIssue.id })
  return queuedIssue
}
