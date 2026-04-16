import type { VerificationRecord } from '@watchtower/contracts'
import { spawn } from 'node:child_process'

export function pickVerificationCommands(input: {
  verificationCmds: string[]
}) {
  return [...input.verificationCmds]
}

async function runVerificationCommand(command: string, cwd: string): Promise<VerificationRecord> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', chunk => {
      stdout += String(chunk)
    })

    child.stderr.on('data', chunk => {
      stderr += String(chunk)
    })

    child.on('error', reject)
    child.on('close', code => {
      resolve({
        command,
        exitCode: code ?? 1,
        stdout,
        stderr,
      })
    })
  })
}

export async function verifyFixJob(
  input: {
    repository: {
      localPath: string
      verificationCmds: string[]
    }
  },
  deps: {
    runCommand?: (command: string, cwd: string) => Promise<VerificationRecord>
  } = {},
) {
  const runCommand = deps.runCommand ?? runVerificationCommand
  const commands = pickVerificationCommands(input.repository)
  const records: VerificationRecord[] = []

  for (const command of commands) {
    const record = await runCommand(command, input.repository.localPath)
    records.push(record)

    if (record.exitCode !== 0) {
      return { ok: false as const, records }
    }
  }

  return { ok: true as const, records }
}
