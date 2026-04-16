import { describe, expect, it, vi } from 'vitest'
import { pickVerificationCommands, verifyFixJob } from './verify-fix.js'

describe('pickVerificationCommands', () => {
  it('returns the configured ai-code gate', () => {
    expect(
      pickVerificationCommands({
        verificationCmds: ['pnpm lint', 'pnpm build'],
      }),
    ).toEqual(['pnpm lint', 'pnpm build'])
  })
})

describe('verifyFixJob', () => {
  it('stops at the first failing verification command', async () => {
    const runCommand = vi
      .fn()
      .mockResolvedValueOnce({
        command: 'pnpm lint',
        exitCode: 0,
        stdout: 'lint ok',
        stderr: '',
      })
      .mockResolvedValueOnce({
        command: 'pnpm build',
        exitCode: 1,
        stdout: '',
        stderr: 'build failed',
      })

    const result = await verifyFixJob(
      {
        repository: {
          localPath: 'C:\\Users\\48150\\Desktop\\mycode\\ai-code',
          verificationCmds: ['pnpm lint', 'pnpm build'],
        },
      },
      { runCommand },
    )

    expect(result.ok).toBe(false)
    expect(runCommand).toHaveBeenCalledTimes(2)
    expect(result.records).toEqual([
      {
        command: 'pnpm lint',
        exitCode: 0,
        stdout: 'lint ok',
        stderr: '',
      },
      {
        command: 'pnpm build',
        exitCode: 1,
        stdout: '',
        stderr: 'build failed',
      },
    ])
  })
})
