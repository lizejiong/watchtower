import Link from 'next/link'
import { IssuesTable } from '../components/issues-table.js'
import { getIssues, getRepositories } from '../lib/api.js'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [issues, repositories] = await Promise.all([getIssues(), getRepositories()])
  const autoRepairReady = repositories.filter(repository => repository.autoRepairEnabled).length
  const activeIssues = issues.filter(issue => issue.status !== 'ignored').length
  const openPrIssues = issues.filter(issue => issue.status === 'pr_opened').length
  const skippedIssues = issues.filter(issue => issue.status === 'auto_skipped').length

  return (
    <main className="grid">
      <section className="summary-grid">
        <article className="summary-card">
          <p className="summary-label">Repositories</p>
          <p className="summary-value">{repositories.length}</p>
          <p className="summary-hint">Registered target repositories inside Watchtower.</p>
        </article>
        <article className="summary-card">
          <p className="summary-label">Auto Repair Ready</p>
          <p className="summary-value">{autoRepairReady}</p>
          <p className="summary-hint">Repositories with auto repair enabled and rules configured.</p>
        </article>
        <article className="summary-card">
          <p className="summary-label">Tracked Issues</p>
          <p className="summary-value">{activeIssues}</p>
          <p className="summary-hint">Issues already stored and not ignored.</p>
        </article>
        <article className="summary-card">
          <p className="summary-label">Opened Draft PRs</p>
          <p className="summary-value">{openPrIssues}</p>
          <p className="summary-hint">Issues that cleared verification and opened a draft PR.</p>
        </article>
      </section>

      <section className="grid grid-two">
        <article className="panel">
          <div className="panel-inner">
            <div className="section-head">
              <h2 className="section-title">Issue Queue</h2>
              <span className="section-meta">{issues.length} total</span>
            </div>
            <IssuesTable issues={issues} />
          </div>
        </article>

        <article className="panel">
          <div className="panel-inner stack">
            <div className="section-head">
              <h2 className="section-title">Flow Notes</h2>
              <span className="section-meta">MVP scope</span>
            </div>
            <div className="kv-list">
              <div className="kv-item">
                <span className="kv-label">Primary Loop</span>
                <strong>Sentry {'->'} Watchtower poller {'->'} AI patch {'->'} lint/build {'->'} GitHub draft PR</strong>
              </div>
              <div className="kv-item">
                <span className="kv-label">Auto Skipped</span>
                <strong>{skippedIssues} issues currently stopped by repair policy or duplicate PR rules.</strong>
              </div>
              <div className="kv-item">
                <span className="kv-label">Next Step</span>
                <strong>
                  <Link href="/repositories">Register ai-code and verify the end-to-end polling flow.</Link>
                </strong>
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}
