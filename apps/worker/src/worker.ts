import { queueNames } from './queues.js'

export function startWorker() {
  return `watchtower-worker:${Object.values(queueNames).join(',')}`
}

if (process.env.NODE_ENV !== 'test') {
  console.log(startWorker())
}
