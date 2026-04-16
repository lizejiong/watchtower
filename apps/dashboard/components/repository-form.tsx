'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition, type FormEvent } from 'react'
import { getApiBaseForClient, getRepositoryDraft } from '../lib/api.js'

const defaultDraft = getRepositoryDraft()

export function RepositoryForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState(defaultDraft)

  function updateField<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft(current => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)

    startTransition(async () => {
      try {
        const payload = {
          name: draft.name,
          localPath: draft.localPath,
          remoteUrl: draft.remoteUrl,
          defaultBranch: draft.defaultBranch,
          provider: draft.provider,
          sentryOrgSlug: draft.sentryOrgSlug,
          sentryProjectSlug: draft.sentryProjectSlug,
          autoRepairEnabled: draft.autoRepairEnabled,
          autoRepairRules: JSON.parse(draft.autoRepairRules),
          verificationCmds: draft.verificationCmds
            .split('\n')
            .map(item => item.trim())
            .filter(Boolean),
        }

        const response = await fetch(`${getApiBaseForClient()}/repositories`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error(`Repository create failed with ${response.status}`)
        }

        setMessage('Repository configuration was saved. The page will refresh to load the latest data.')
        router.refresh()
      } catch (submissionError) {
        const nextMessage = submissionError instanceof Error ? submissionError.message : 'Unknown repository submit error'
        setError(nextMessage)
      }
    })
  }

  return (
    <form className="repository-form" onSubmit={onSubmit}>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="repository-name">Repository</label>
          <input id="repository-name" value={draft.name} onChange={event => updateField('name', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="repository-branch">Default Branch</label>
          <input
            id="repository-branch"
            value={draft.defaultBranch}
            onChange={event => updateField('defaultBranch', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="repository-local-path">Local Path</label>
          <input
            id="repository-local-path"
            value={draft.localPath}
            onChange={event => updateField('localPath', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="repository-remote-url">Remote URL</label>
          <input
            id="repository-remote-url"
            value={draft.remoteUrl}
            onChange={event => updateField('remoteUrl', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="repository-sentry-org">Sentry Org</label>
          <input
            id="repository-sentry-org"
            value={draft.sentryOrgSlug}
            onChange={event => updateField('sentryOrgSlug', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="repository-sentry-project">Sentry Project</label>
          <input
            id="repository-sentry-project"
            value={draft.sentryProjectSlug}
            onChange={event => updateField('sentryProjectSlug', event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="repository-auto-rules">Auto Repair Rules (JSON)</label>
        <textarea
          id="repository-auto-rules"
          value={draft.autoRepairRules}
          onChange={event => updateField('autoRepairRules', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="repository-verification">Verification Commands</label>
        <textarea
          id="repository-verification"
          value={draft.verificationCmds}
          onChange={event => updateField('verificationCmds', event.target.value)}
        />
      </div>

      <div className="form-row">
        <button className="button" disabled={isPending} type="submit">
          {isPending ? 'Submitting...' : 'Register Repository'}
        </button>
        <span className="form-note">The default draft is aligned with the ai-code + Sentry + lint/build MVP setup.</span>
      </div>

      {message ? <div className="form-note">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}
    </form>
  )
}
