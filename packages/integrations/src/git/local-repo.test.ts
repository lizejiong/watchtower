import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { commitAndPushBranch, discardLocalChanges, ensureRepositoryClean } from './local-repo.js'
import { preparePatchBranch } from './worktree.js'

const execFileAsync = promisify(execFile)

async function runGit(args: string[], cwd: string) {
  await execFileAsync('git', args, { cwd })
}

async function createTempRepository() {
  const repoPath = await mkdtemp(join(tmpdir(), 'watchtower-integrations-'))

  await runGit(['init', '-b', 'main'], repoPath)
  await runGit(['config', 'user.name', 'Watchtower Test'], repoPath)
  await runGit(['config', 'user.email', 'watchtower@example.com'], repoPath)
  await writeFile(join(repoPath, 'README.md'), '# temp repo\n', 'utf8')
  await runGit(['add', 'README.md'], repoPath)
  await runGit(['commit', '-m', 'chore: initial commit'], repoPath)

  return repoPath
}

async function createBareRepository() {
  const repoPath = await mkdtemp(join(tmpdir(), 'watchtower-origin-'))
  await runGit(['init', '--bare'], repoPath)
  return repoPath
}

const repositories: string[] = []

afterEach(async () => {
  await Promise.all(repositories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('ensureRepositoryClean', () => {
  it('accepts a clean git repository', async () => {
    const repoPath = await createTempRepository()
    repositories.push(repoPath)

    await expect(ensureRepositoryClean(repoPath)).resolves.toBeUndefined()
  })

  it('rejects dirty working trees', async () => {
    const repoPath = await createTempRepository()
    repositories.push(repoPath)

    await writeFile(join(repoPath, 'README.md'), '# changed\n', 'utf8')

    await expect(ensureRepositoryClean(repoPath)).rejects.toThrow('clean')
  })
})

describe('preparePatchBranch', () => {
  it('creates and switches to a dedicated patch branch', async () => {
    const repoPath = await createTempRepository()
    repositories.push(repoPath)

    const branchName = 'watchtower/issue-123'
    const result = await preparePatchBranch({
      repoPath,
      branchName,
      baseBranch: 'main',
    })

    const branch = await execFileAsync('git', ['branch', '--show-current'], { cwd: repoPath })

    expect(result.branchName).toBe(branchName)
    expect(branch.stdout.trim()).toBe(branchName)
  })
})

describe('commitAndPushBranch', () => {
  it('commits local changes and pushes the branch to origin', async () => {
    const repoPath = await createTempRepository()
    const originPath = await createBareRepository()
    repositories.push(repoPath, originPath)

    await runGit(['remote', 'add', 'origin', originPath], repoPath)
    await runGit(['push', '-u', 'origin', 'main'], repoPath)

    const branchName = 'watchtower/issue-123'
    await preparePatchBranch({
      repoPath,
      branchName,
      baseBranch: 'main',
    })

    await writeFile(join(repoPath, 'README.md'), '# patched\n', 'utf8')

    await commitAndPushBranch({
      repoPath,
      branchName,
      commitMessage: 'fix: patch readme',
    })

    const remoteBranch = await execFileAsync('git', ['show-ref', '--verify', `refs/heads/${branchName}`], {
      cwd: originPath,
    })

    expect(remoteBranch.stdout).toContain(branchName)
  })
})

describe('discardLocalChanges', () => {
  it('resets tracked changes back to HEAD', async () => {
    const repoPath = await createTempRepository()
    repositories.push(repoPath)

    await writeFile(join(repoPath, 'README.md'), '# changed\n', 'utf8')
    await discardLocalChanges(repoPath)

    await expect(ensureRepositoryClean(repoPath)).resolves.toBeUndefined()
  })
})
