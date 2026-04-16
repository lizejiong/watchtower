import { access, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { createPatchWorktree } from './worktree.js'

const execFileAsync = promisify(execFile)

async function runGit(args: string[], cwd: string) {
  await execFileAsync('git', args, { cwd })
}

async function createTempRepository() {
  const repoPath = await mkdtemp(join(tmpdir(), 'watchtower-worktree-base-'))

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

describe('createPatchWorktree', () => {
  it('creates an isolated worktree and removes it during cleanup', async () => {
    const repoPath = await createTempRepository()
    repositories.push(repoPath)

    const workspace = await createPatchWorktree({
      repoPath,
      branchName: 'watchtower/issue-123',
      baseBranch: 'main',
    })

    const branch = await execFileAsync('git', ['branch', '--show-current'], { cwd: workspace.worktreePath })

    expect(branch.stdout.trim()).toBe('watchtower/issue-123')
    expect(workspace.worktreePath).not.toBe(repoPath)

    await workspace.cleanup()

    await expect(access(workspace.worktreePath)).rejects.toThrow()
  })
})
