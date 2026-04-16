import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { IssueRecord, PatchCodeContextFile, RepositoryRecord } from '@watchtower/core'
import { nextIssueState } from '@watchtower/core'
import { analyzeIssueJob } from './jobs/analyze-issue.js'
import { openPrJob } from './jobs/open-pr.js'
import { verifyFixJob } from './jobs/verify-fix.js'
import { applyPatch, commitAndPushBranch, createPatchWorktree, discardLocalChanges, openDraftPullRequest } from '@watchtower/integrations'

interface IssueLookupStore {
  findById(issueId: string): IssueRecord | Promise<IssueRecord | undefined> | undefined
  updateStatus(issueId: string, status: IssueRecord['status']): IssueRecord | Promise<IssueRecord>
}

interface RepositoryLookupStore {
  findById(repositoryId: string): RepositoryRecord | Promise<RepositoryRecord | undefined> | undefined
}

async function loadCodeContextFromIssue(repository: RepositoryRecord, issue: IssueRecord): Promise<PatchCodeContextFile[]> {
  if (!issue.culprit) {
    return []
  }

  try {
    const filePath = join(repository.localPath, ...issue.culprit.split('/'))
    const content = await readFile(filePath, 'utf8')

    return [
      {
        path: issue.culprit,
        content,
      },
    ]
  } catch {
    return []
  }
}

export async function processIssueAnalysis(input: {
  issueId: string
}, deps: {
  issueStore: IssueLookupStore
  repositoryStore: RepositoryLookupStore
  loadCodeContext?: (repository: RepositoryRecord, issue: IssueRecord) => Promise<PatchCodeContextFile[]>
  analyzeIssue?: typeof analyzeIssueJob
  createPatchWorkspace?: typeof createPatchWorktree
  applyPatch?: typeof applyPatch
  verifyFix?: typeof verifyFixJob
  discardLocalChanges?: typeof discardLocalChanges
  commitAndPushBranch?: typeof commitAndPushBranch
  openDraftPr?: Parameters<typeof openPrJob>[0]['openDraftPr']
}) {
  const issue = await deps.issueStore.findById(input.issueId)

  if (!issue) {
    throw new Error(`Issue not found: ${input.issueId}`)
  }

  const repository = await deps.repositoryStore.findById(issue.repositoryId)

  if (!repository) {
    throw new Error(`Repository not found: ${issue.repositoryId}`)
  }

  await deps.issueStore.updateStatus(issue.id, nextIssueState(issue.status, 'analysis_started'))

  const codeContext = await (deps.loadCodeContext ?? loadCodeContextFromIssue)(repository, issue)
  const analysisResult = await (deps.analyzeIssue ?? analyzeIssueJob)({
    issueId: issue.id,
    context: {
      issue: {
        id: issue.id,
        title: issue.title,
        culprit: issue.culprit,
        level: issue.level,
      },
      event: {
        issueId: issue.externalIssueId,
      },
      repository: {
        id: repository.id,
        name: repository.name,
        localPath: repository.localPath,
        defaultBranch: repository.defaultBranch,
      },
    },
    codeContext,
  })

  await deps.issueStore.updateStatus(issue.id, analysisResult.status)

  if (!analysisResult.patch) {
    return {
      issueId: issue.id,
      status: analysisResult.status,
      analysis: analysisResult.analysis,
    }
  }

  const workspace = await (deps.createPatchWorkspace ?? createPatchWorktree)({
    repoPath: repository.localPath,
    branchName: analysisResult.patch.branchName,
    baseBranch: repository.defaultBranch,
  })

  try {
    await (deps.applyPatch ?? applyPatch)(workspace.worktreePath, analysisResult.patch.diff)

    const verification = await (deps.verifyFix ?? verifyFixJob)({
      repository: {
        localPath: workspace.worktreePath,
        verificationCmds: repository.verificationCmds,
      },
    })

    if (!verification.ok) {
      await (deps.discardLocalChanges ?? discardLocalChanges)(workspace.worktreePath)

      const failedResult = await openPrJob({
        issue: {
          id: issue.id,
          title: issue.title,
        },
        repository: {
          remoteUrl: repository.remoteUrl,
          defaultBranch: repository.defaultBranch,
        },
        branchName: analysisResult.patch.branchName,
        summary: analysisResult.analysis.summary,
        sentryIssueUrl: `https://sentry.io/issues/${issue.externalIssueId}`,
        verification: verification.records,
        openDraftPr: deps.openDraftPr,
      })

      await deps.issueStore.updateStatus(issue.id, failedResult.status)
      return failedResult
    }

    await (deps.commitAndPushBranch ?? commitAndPushBranch)({
      repoPath: workspace.worktreePath,
      branchName: analysisResult.patch.branchName,
      commitMessage: analysisResult.patch.commitMessage,
    })

    const prResult = await openPrJob({
      issue: {
        id: issue.id,
        title: issue.title,
      },
      repository: {
        remoteUrl: repository.remoteUrl,
        defaultBranch: repository.defaultBranch,
      },
      branchName: analysisResult.patch.branchName,
      summary: analysisResult.analysis.summary,
      sentryIssueUrl: `https://sentry.io/issues/${issue.externalIssueId}`,
      verification: verification.records,
      openDraftPr: deps.openDraftPr ?? openDraftPullRequest,
    })

    await deps.issueStore.updateStatus(issue.id, prResult.status)

    return {
      ...prResult,
      analysis: analysisResult.analysis,
    }
  } finally {
    await workspace.cleanup()
  }
}
