import { ensureRepositoryClean, getCurrentBranch } from './local-repo.js'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

export async function createPatchWorktree(input: {
  repoPath: string
  branchName: string
  baseBranch: string
  rootDir?: string
}) {
  await ensureRepositoryClean(input.repoPath)

  const worktreeRoot = input.rootDir ?? process.env.WATCHTOWER_WORKTREE_ROOT ?? join(tmpdir(), 'watchtower-worktrees')
  await mkdir(worktreeRoot, { recursive: true })
  const worktreePath = await mkdtemp(join(worktreeRoot, 'issue-'))

  await runGit(input.repoPath, ['worktree', 'add', '--detach', worktreePath, input.baseBranch])

  try {
    await runGit(worktreePath, ['switch', '-C', input.branchName])
  } catch (error) {
    await runGit(input.repoPath, ['worktree', 'remove', '--force', worktreePath])
    await rm(worktreePath, { recursive: true, force: true })
    throw error
  }

  let cleanedUp = false

  return {
    branchName: input.branchName,
    worktreePath,
    async cleanup() {
      if (cleanedUp) {
        return
      }

      cleanedUp = true
      await runGit(input.repoPath, ['worktree', 'remove', '--force', worktreePath])
      await rm(worktreePath, { recursive: true, force: true })
    },
  }
}
