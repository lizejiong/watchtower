export interface IssueView {
  id: string
  repositoryId: string
  externalIssueId: string
  title: string
  culprit?: string
  level?: string
  status:
    | 'new'
    | 'queued'
    | 'auto_skipped'
    | 'analyzing'
    | 'fix_suggested'
    | 'verification_failed'
    | 'pr_opened'
    | 'ignored'
}

export interface RepositoryView {
  id: string
  name: string
  localPath: string
  remoteUrl: string
  defaultBranch: string
  provider: string
  sentryOrgSlug: string
  sentryProjectSlug: string
  autoRepairEnabled: boolean
  autoRepairRules?: Record<string, unknown>
  verificationCmds: string[]
}

function getApiBaseUrl() {
  return process.env.WATCHTOWER_API_BASE_URL ?? 'http://localhost:4000'
}

async function safeFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return fallback
    }

    return await response.json() as T
  } catch {
    return fallback
  }
}

export async function getIssues() {
  return safeFetch<IssueView[]>('/issues', [])
}

export async function getIssue(issueId: string) {
  const issues = await getIssues()
  return issues.find(issue => issue.id === issueId) ?? null
}

export async function getRepositories() {
  return safeFetch<RepositoryView[]>('/repositories', [])
}

export function getRepositoryDraft() {
  return {
    name: 'ai-code',
    localPath: 'C:\\Users\\48150\\Desktop\\mycode\\ai-code',
    remoteUrl: 'https://github.com/lzj2000/ai-code.git',
    defaultBranch: 'main',
    provider: 'github',
    sentryOrgSlug: 'demo-org',
    sentryProjectSlug: 'ai-code-web',
    autoRepairEnabled: true,
    autoRepairRules: JSON.stringify({ minLevel: 'error', allowFrameworks: ['nextjs'] }, null, 2),
    verificationCmds: 'pnpm lint\npnpm build',
  }
}

export function getApiBaseForClient() {
  return getApiBaseUrl()
}
