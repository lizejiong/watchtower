export interface SentryProjectIssue {
  id: string
  title: string
  culprit?: string
  level?: string
  projectSlug: string
}

export interface SentryIssuesClientLike {
  listProjectIssues(input: {
    orgSlug: string
    projectSlug: string
  }): Promise<SentryProjectIssue[]>
}

type FetchLike = typeof fetch

function buildIssuesUrl(baseUrl: string, input: {
  orgSlug: string
  projectSlug: string
}) {
  const url = new URL(`/api/0/projects/${input.orgSlug}/${input.projectSlug}/issues/`, baseUrl)
  url.searchParams.set('query', 'is:unresolved')
  return url.toString()
}

export function createSentryClient(input: {
  token?: string
  baseUrl?: string
  fetch?: FetchLike
} = {}): SentryIssuesClientLike {
  const token = input.token ?? process.env.SENTRY_AUTH_TOKEN
  const baseUrl = input.baseUrl ?? process.env.SENTRY_BASE_URL ?? 'https://sentry.io'
  const fetchImpl = input.fetch ?? fetch

  if (!token) {
    throw new Error('Missing SENTRY_AUTH_TOKEN for Sentry issue polling')
  }

  return {
    async listProjectIssues(request) {
      const response = await fetchImpl(buildIssuesUrl(baseUrl, request), {
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Sentry issues request failed with ${response.status}`)
      }

      const payload = await response.json() as Array<{
        id: string
        title: string
        culprit?: string
        level?: string
        project?: {
          slug?: string
        }
      }>

      return payload.map(issue => ({
        id: issue.id,
        title: issue.title,
        culprit: issue.culprit,
        level: issue.level,
        projectSlug: issue.project?.slug ?? request.projectSlug,
      }))
    },
  }
}
