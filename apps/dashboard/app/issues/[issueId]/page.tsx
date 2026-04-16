import { notFound } from 'next/navigation'
import { IssueDetail } from '../../../components/issue-detail.js'
import { getIssue } from '../../../lib/api.js'

export const dynamic = 'force-dynamic'

export default async function IssueDetailPage(input: {
  params: Promise<{ issueId: string }>
}) {
  const { issueId } = await input.params
  const issue = await getIssue(issueId)

  if (!issue) {
    notFound()
  }

  return <IssueDetail issue={issue} />
}
