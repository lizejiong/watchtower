import { access } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { buildApp } from '../../apps/api/src/app.ts'
import { analyzeIssueJob } from '../../apps/worker/src/jobs/analyze-issue.ts'
import { openPrJob } from '../../apps/worker/src/jobs/open-pr.ts'
import { verifyFixJob } from '../../apps/worker/src/jobs/verify-fix.ts'
import { nextIssueState } from '../../packages/core/src/state-machine.ts'

const aiCodePath = process.env.AI_CODE_PATH ?? 'C:\\Users\\48150\\Desktop\\mycode\\ai-code'
const aiCodeRemote = 'https://github.com/lzj2000/ai-code.git'

async function ensurePathExists(path: string) {
  await access(path)
}

async function main() {
  await ensurePathExists(aiCodePath)

  const app = await buildApp()

  try {
    const repositoryResponse = await app.inject({
      method: 'POST',
      url: '/repositories',
      payload: {
        name: 'ai-code',
        localPath: aiCodePath,
        remoteUrl: aiCodeRemote,
        defaultBranch: 'main',
        provider: 'github',
        sentryOrgSlug: 'demo-org',
        sentryProjectSlug: 'ai-code-web',
        autoRepairEnabled: true,
        autoRepairRules: {
          minLevel: 'error',
          allowFrameworks: ['nextjs'],
        },
        verificationCmds: ['pnpm lint', 'pnpm build'],
      },
    })

    assert.equal(repositoryResponse.statusCode, 201, 'repository registration should succeed')
    const repository = repositoryResponse.json()

    const webhookResponse = await app.inject({
      method: 'POST',
      url: '/webhooks/sentry',
      payload: {
        action: 'triggered',
        data: {
          issue: {
            id: 'issue-123',
            title: 'Chat route crashes on missing thread_id',
            culprit: 'app/api/chat/route.ts',
            level: 'error',
            projectSlug: 'ai-code-web',
          },
        },
      },
    })

    assert.equal(webhookResponse.statusCode, 202, 'Sentry webhook should be accepted')

    const issues = app.issueStore.list()
    assert.equal(issues.length, 1, 'one issue should be stored after webhook sync')

    const queuedIssue = issues[0]
    assert.equal(queuedIssue.status, 'queued', 'eligible issues should enter the queued state')

    const analyzingIssue = app.issueStore.updateStatus(
      queuedIssue.id,
      nextIssueState(queuedIssue.status, 'analysis_started'),
    )

    const analysisResult = await analyzeIssueJob({
      issueId: analyzingIssue.id,
      context: {
        issue: {
          id: analyzingIssue.id,
          title: analyzingIssue.title,
          culprit: analyzingIssue.culprit,
          level: analyzingIssue.level,
        },
        event: {
          issueId: queuedIssue.externalIssueId,
        },
        repository: {
          id: repository.id,
          name: repository.name,
          localPath: repository.localPath,
          defaultBranch: repository.defaultBranch,
        },
      },
      codeContext: [
        {
          path: 'app/api/chat/route.ts',
          content: 'export async function POST() { return Response.json({ ok: true }) }\n',
        },
      ],
      analyze: async () => ({
        summary: 'Missing thread_id validation in the chat route.',
        rootCause: 'The route forwards thread_id without a defensive check before stream setup.',
        suspectFiles: ['app/api/chat/route.ts'],
        fixable: true,
        confidence: 0.9,
        fixPlan: ['Guard missing thread_id before stream setup', 'Return a 400 response for invalid payloads'],
        verificationPlan: ['pnpm lint', 'pnpm build'],
      }),
      createPatch: async () => ({
        summary: 'Guard missing thread_id before starting the chat stream.',
        branchName: 'watchtower/issue-123',
        commitMessage: 'fix: guard missing thread_id in chat route',
        diff: 'diff --git a/app/api/chat/route.ts b/app/api/chat/route.ts\n',
      }),
    })

    assert.equal(analysisResult.status, 'fix_suggested', 'analysis should produce a fix suggestion')
    assert.ok(analysisResult.patch, 'fixable analysis should generate a patch draft')

    const verificationResult = await verifyFixJob(
      {
        repository: {
          localPath: repository.localPath,
          verificationCmds: repository.verificationCmds,
        },
      },
      {
        runCommand: async (command) => ({
          command,
          exitCode: 0,
          stdout: `${command} ok`,
          stderr: '',
        }),
      },
    )

    assert.equal(verificationResult.ok, true, 'fixture verification commands should pass')

    const prResult = await openPrJob({
      issue: {
        id: analyzingIssue.id,
        title: analyzingIssue.title,
      },
      repository: {
        remoteUrl: repository.remoteUrl,
        defaultBranch: repository.defaultBranch,
      },
      branchName: analysisResult.patch.branchName,
      summary: analysisResult.analysis.summary,
      sentryIssueUrl: `https://sentry.io/issues/${queuedIssue.externalIssueId}`,
      verification: verificationResult.records,
      openDraftPr: async () => ({
        number: 42,
        htmlUrl: 'https://github.com/lzj2000/ai-code/pull/42',
      }),
    })

    assert.equal(prResult.status, 'pr_opened', 'successful verification should open a draft PR')
    assert.equal(prResult.prUrl, 'https://github.com/lzj2000/ai-code/pull/42')

    app.issueStore.updateStatus(analyzingIssue.id, prResult.status)

    const finalIssue = app.issueStore.list()[0]
    assert.equal(finalIssue.status, 'pr_opened', 'issue store should reflect the draft PR state')

    console.log(JSON.stringify({
      smoke: 'passed',
      repository: {
        id: repository.id,
        name: repository.name,
      },
      issue: {
        id: finalIssue.id,
        status: finalIssue.status,
      },
      analysis: {
        summary: analysisResult.analysis.summary,
        patchBranch: analysisResult.patch.branchName,
      },
      verification: verificationResult.records.map(record => ({
        command: record.command,
        exitCode: record.exitCode,
      })),
      pr: {
        url: prResult.prUrl,
        number: prResult.prNumber,
      },
    }, null, 2))
  }
  finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
