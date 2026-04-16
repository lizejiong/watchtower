import { Queue } from 'bullmq'

export const queueNames = {
  issueSync: 'issue-sync',
  issueAnalysis: 'issue-analysis',
  prOpen: 'pr-open',
} as const

export function createRedisConnection(redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379') {
  const url = new URL(redisUrl)

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
  }
}

export function createQueues(redisUrl?: string) {
  const connection = createRedisConnection(redisUrl)

  return {
    issueSync: new Queue(queueNames.issueSync, { connection }),
    issueAnalysis: new Queue(queueNames.issueAnalysis, { connection }),
    prOpen: new Queue(queueNames.prOpen, { connection }),
  }
}
