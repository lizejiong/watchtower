import { Worker } from 'bullmq'
import { createPrismaAnalysisRunStore, createPrismaIssueStore, createPrismaRepositoryStore } from '@watchtower/db'
import { createSentryClient } from '@watchtower/integrations'
import { processIssueAnalysis } from './process-issue-analysis.js'
import { createQueues, createRedisConnection, queueNames } from './queues.js'
import { pollSentryIssues } from './poller.js'

export function startWorker() {
  const repositoryStore = createPrismaRepositoryStore()
  const issueStore = createPrismaIssueStore()
  const analysisRunStore = createPrismaAnalysisRunStore()
  const queues = createQueues()
  const connection = createRedisConnection()
  const sentryClient = createSentryClient()
  const intervalMs = Number(process.env.SENTRY_POLL_INTERVAL_MS ?? '60000')
  const issueAnalysisWorker = new Worker(
    queueNames.issueAnalysis,
    async job => {
      await processIssueAnalysis(
        {
          issueId: String(job.data.issueId),
        },
        {
          issueStore,
          analysisRunStore,
          repositoryStore,
        },
      )
    },
    {
      connection,
    },
  )

  issueAnalysisWorker.on('failed', (job, error) => {
    console.error(
      JSON.stringify({
        worker: 'watchtower',
        queue: queueNames.issueAnalysis,
        jobId: job?.id,
        issueId: job?.data?.issueId,
        error: error.message,
      }),
    )
  })

  async function tick() {
    const summary = await pollSentryIssues({
      repositoryStore,
      issueStore,
      analysisQueue: {
        add: async (name, payload) => queues.issueAnalysis.add(name, payload),
      },
      sentryClient,
    })

    console.log(
      JSON.stringify({
        worker: 'watchtower',
        poll: 'completed',
        repositories: summary.repositories,
        syncedIssues: summary.syncedIssues,
      }),
    )
  }

  void tick()
  setInterval(() => {
    void tick()
  }, intervalMs)

  return `watchtower-worker:${Object.values(queueNames).join(',')}`
}

if (process.env.NODE_ENV !== 'test') {
  console.log(startWorker())
}
