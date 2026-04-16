import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { ensureRepositoryClean } from './local-repo.js'
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
