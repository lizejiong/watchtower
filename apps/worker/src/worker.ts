export function startWorker() {
  return 'watchtower-worker'
}

if (process.env.NODE_ENV !== 'test') {
  console.log(startWorker())
}
