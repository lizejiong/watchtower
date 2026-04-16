import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      port: number
    }
  }
}

export const envPlugin = fp(async (app) => {
  app.decorate('config', {
    port: Number(process.env.PORT ?? '4000'),
  })
})
