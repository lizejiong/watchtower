import { ensureRepositoryClean, getCurrentBranch } from './local-repo.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function runGit(repoPath: string, args: string[]) {
  await execFileAsync('git', ['-C', repoPath, ...args], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
}

async function hasRef(repoPath: string, ref: string) {
  try {
    await execFileAsync('git', ['-C', repoPath, 'rev-parse', '--verify', ref], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    })
    return true
  } catch {
    return false
  }
}

export async function preparePatchBranch(input: {
  repoPath: string
  branchName: string
  baseBranch: string
}) {
  await ensureRepositoryClean(input.repoPath)

  const currentBranch = await getCurrentBranch(input.repoPath)
  if (currentBranch !== input.baseBranch && (await hasRef(input.repoPath, input.baseBranch))) {
    await runGit(input.repoPath, ['switch', input.baseBranch])
  }

  await runGit(input.repoPath, ['switch', '-c', input.branchName])

  return {
    branchName: input.branchName,
  }
}
