import type { IssueView } from '../lib/api.js'

function getStatusClassName(status: IssueView['status']) {
  return `status-badge status-${status}`
}

export function IssueDetail(input: {
  issue: IssueView
}) {
  const { issue } = input

  return (
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-inner stack">
          <div className="detail-hero">
            <span className={getStatusClassName(issue.status)}>{issue.status}</span>
            <h1 className="detail-title">{issue.title}</h1>
            <p className="brand-copy">
              这是 Watchtower 当前保存的 issue 视图。分析结果、验证记录和 PR 链接会继续追加在这个详情页。
            </p>
          </div>

          <div className="kv-list">
            <div className="kv-item">
              <span className="kv-label">Culprit</span>
              <strong>{issue.culprit ?? 'No culprit provided by Sentry'}</strong>
            </div>
            <div className="kv-item">
              <span className="kv-label">Level</span>
              <strong>{issue.level ?? 'unknown'}</strong>
            </div>
            <div className="kv-item">
              <span className="kv-label">External Issue ID</span>
              <strong>{issue.externalIssueId}</strong>
            </div>
          </div>
        </div>
      </section>

      <aside className="stack">
        <section className="panel">
          <div className="panel-inner">
            <div className="section-head">
              <h2 className="section-title">Repair Track</h2>
            </div>
            <p className="form-note">
              V1 目前已经具备自动判断、AI 分析、补丁生成、验证闸门和 draft PR 打开能力。
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-inner">
            <div className="section-head">
              <h2 className="section-title">Current Gaps</h2>
            </div>
            <p className="form-note">
              这个页签下一步会接入 analysis summary、verification records、draft PR URL 和 auto_skipped 原因。
            </p>
          </div>
        </section>
      </aside>
    </div>
  )
}
