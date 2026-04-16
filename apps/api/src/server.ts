import { buildApp } from './app.js'

async function start() {
  const app = await buildApp()

  await app.listen({
    host: '0.0.0.0',
    port: app.config.port,
  })
}

if (process.env.NODE_ENV !== 'test') {
  start().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
