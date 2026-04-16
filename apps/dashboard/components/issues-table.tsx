import Link from 'next/link'
import type { IssueView } from '../lib/api.js'

function getStatusClassName(status: IssueView['status']) {
  return `status-badge status-${status}`
}

export function IssuesTable(input: {
  issues: IssueView[]
}) {
  if (input.issues.length === 0) {
    return (
      <p className="empty-state">
        还没有同步到 issue。Sentry webhook 进来后，这里会显示自动修复资格判断和状态流转。
      </p>
    )
  }

  return (
    <table className="issues-table">
      <thead>
        <tr>
          <th>Issue</th>
          <th>Status</th>
          <th>Level</th>
          <th>Culprit</th>
        </tr>
      </thead>
      <tbody>
        {input.issues.map(issue => (
          <tr key={issue.id}>
            <td>
              <Link className="issue-title" href={`/issues/${issue.id}`}>
                {issue.title}
              </Link>
              <span className="issue-meta">
                External ID: {issue.externalIssueId}
                <br />
                Repository: {issue.repositoryId}
              </span>
            </td>
            <td>
              <span className={getStatusClassName(issue.status)}>{issue.status}</span>
            </td>
            <td>{issue.level ?? 'unknown'}</td>
            <td>{issue.culprit ?? 'No culprit'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
