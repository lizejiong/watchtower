export interface CreateDraftPullRequestInput {
  owner: string
  repo: string
  title: string
  head: string
  base: string
  body: string
}

export interface GitHubDraftPullRequestResult {
  number: number
  htmlUrl: string
}

export interface GitHubPullRequestClientLike {
  createDraftPullRequest(input: CreateDraftPullRequestInput): Promise<GitHubDraftPullRequestResult>
}

export function createGitHubClient(input: {
  token?: string
  baseUrl?: string
} = {}): GitHubPullRequestClientLike {
  const token = input.token ?? process.env.GITHUB_TOKEN
  const baseUrl = input.baseUrl ?? 'https://api.github.com'

  if (!token) {
    throw new Error('Missing GITHUB_TOKEN for draft PR creation')
  }

  return {
    async createDraftPullRequest(request) {
      const response = await fetch(`${baseUrl}/repos/${request.owner}/${request.repo}/pulls`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({
          title: request.title,
          head: request.head,
          base: request.base,
          body: request.body,
          draft: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`GitHub draft PR request failed with ${response.status}`)
      }

      const payload = await response.json() as {
        number: number
        html_url: string
      }

      return {
        number: payload.number,
        htmlUrl: payload.html_url,
      }
    },
  }
}
