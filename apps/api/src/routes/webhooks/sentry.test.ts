import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from '../../app.js'

describe('POST /webhooks/sentry', () => {
  it('accepts a Sentry webhook payload', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/sentry',
      payload: {
        action: 'triggered',
        data: {
          issue: {
            id: '123',
            title: 'Chat route crash',
          },
        },
      },
    })

    expect(response.statusCode).toBe(202)
  })

  afterAll(async () => {
    const app = await buildApp()
    await app.close()
  })
})
