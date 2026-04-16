import type { IssueView } from '../lib/api.js'

function getStatusClassName(status: IssueView['status']) {
  return `status-badge status-${status}`
}

export function IssueDetail(input: {
  issue: IssueView
}) {
  const { issue } = input
  const latestAnalysis = issue.latestAnalysis

  return (
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-inner stack">
          <div className="detail-hero">
            <span className={getStatusClassName(issue.status)}>{issue.status}</span>
            <h1 className="detail-title">{issue.title}</h1>
            <p className="brand-copy">
              Watchtower keeps the raw Sentry issue here and appends the latest repair run, verification output, and draft PR link.
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

          {latestAnalysis ? (
            <section className="stack">
              <div className="section-head">
                <h2 className="section-title">Latest Analysis</h2>
                <span className="section-meta">{latestAnalysis.status}</span>
              </div>

              <div className="kv-list">
                <div className="kv-item">
                  <span className="kv-label">Summary</span>
                  <strong>{latestAnalysis.summary ?? 'No summary recorded'}</strong>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Root Cause</span>
                  <strong>{latestAnalysis.rootCause ?? 'No root cause recorded'}</strong>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Patch Branch</span>
                  <strong>{latestAnalysis.patchBranch ?? 'No patch branch recorded'}</strong>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Confidence</span>
                  <strong>{latestAnalysis.confidence ?? 'unknown'}</strong>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Draft PR</span>
                  {latestAnalysis.prUrl ? (
                    <a className="link-accent" href={latestAnalysis.prUrl} target="_blank" rel="noreferrer">
                      Open draft PR
                    </a>
                  ) : (
                    <strong>Not opened</strong>
                  )}
                </div>
              </div>

              <div className="section-head">
                <h2 className="section-title">Verification</h2>
                <span className="section-meta">{latestAnalysis.verification?.length ?? 0} commands</span>
              </div>

              <div className="verification-list">
                {latestAnalysis.verification?.length ? (
                  latestAnalysis.verification.map(record => (
                    <article key={`${record.command}:${record.exitCode}`} className="verification-card">
                      <div className="verification-head">
                        <strong>{record.command}</strong>
                        <span className={record.exitCode === 0 ? 'verification-pass' : 'verification-fail'}>
                          exit {record.exitCode}
                        </span>
                      </div>
                      {record.stderr ? <pre className="verification-log">{record.stderr}</pre> : null}
                    </article>
                  ))
                ) : (
                  <p className="form-note">No verification records were stored for this run.</p>
                )}
              </div>
            </section>
          ) : (
            <section className="panel">
              <div className="panel-inner">
                <p className="form-note">No analysis run has been recorded for this issue yet.</p>
              </div>
            </section>
          )}
        </div>
      </section>

      <aside className="stack">
        <section className="panel">
          <div className="panel-inner">
            <div className="section-head">
              <h2 className="section-title">Repair Track</h2>
            </div>
            <p className="form-note">
              V1 now covers automatic qualification, AI analysis, patch generation, verification gates, and draft PR creation.
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-inner">
            <div className="section-head">
              <h2 className="section-title">Current Focus</h2>
            </div>
            <p className="form-note">
              The next hardening layer is retry policy, branch replacement rules, and clearer skip reasons for issues that never enter repair.
            </p>
          </div>
        </section>
      </aside>
    </div>
  )
}
