import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function runGit(repoPath: string, args: string[]) {
  return execFileAsync('git', ['-C', repoPath, ...args], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
}

export async function ensureRepositoryClean(repoPath: string) {
  const { stdout } = await runGit(repoPath, ['status', '--short'])
  const status = stdout.trim()

  if (status.length > 0) {
    throw new Error(`Repository must be clean before repair: ${status}`)
  }
}

export async function getCurrentBranch(repoPath: string) {
  const { stdout } = await runGit(repoPath, ['branch', '--show-current'])
  return stdout.trim()
}

export async function applyPatch(repoPath: string, diff: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('git', ['-C', repoPath, 'apply', '--whitespace=nowarn', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })

    let stderr = ''
    child.stderr.on('data', chunk => {
      stderr += String(chunk)
    })

    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(stderr.trim() || `git apply failed with exit code ${code}`))
    })

    child.stdin.write(diff)
    child.stdin.end()
  })
}

export async function commitAndPushBranch(input: {
  repoPath: string
  branchName: string
  commitMessage: string
}) {
  await runGit(input.repoPath, ['add', '--all'])
  await runGit(input.repoPath, ['commit', '-m', input.commitMessage])
  await runGit(input.repoPath, ['push', '-u', 'origin', input.branchName])
}

export async function discardLocalChanges(repoPath: string) {
  await runGit(repoPath, ['reset', '--hard', 'HEAD'])
}
