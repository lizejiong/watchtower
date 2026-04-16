import { RepositoryForm } from '../../components/repository-form.js'
import { getRepositories } from '../../lib/api.js'

export const dynamic = 'force-dynamic'

export default async function RepositoriesPage() {
  const repositories = await getRepositories()

  return (
    <main className="grid grid-two">
      <section className="panel">
        <div className="panel-inner">
          <div className="section-head">
            <h2 className="section-title">Register Target Repository</h2>
            <span className="section-meta">POST /repositories</span>
          </div>
          <RepositoryForm />
        </div>
      </section>

      <section className="panel">
        <div className="panel-inner">
          <div className="section-head">
            <h2 className="section-title">Configured Repositories</h2>
            <span className="section-meta">{repositories.length} total</span>
          </div>
          <div className="repository-list">
            {repositories.length === 0 ? (
              <p className="empty-state">还没有仓库配置。先用左侧表单注册 `ai-code` 作为第一批目标仓库。</p>
            ) : (
              repositories.map(repository => (
                <article className="repository-card" key={repository.id}>
                  <h3 className="repository-name">{repository.name}</h3>
                  <p className="repository-meta">
                    Local path: {repository.localPath}
                    <br />
                    Remote URL: {repository.remoteUrl}
                    <br />
                    Sentry: {repository.sentryOrgSlug}/{repository.sentryProjectSlug}
                    <br />
                    Auto repair: {repository.autoRepairEnabled ? 'enabled' : 'disabled'}
                    <br />
                    Verification: {repository.verificationCmds.join(', ')}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
