import type { IssueStatus } from '@watchtower/contracts'

export type IssueTransitionEvent =
  | 'queued'
  | 'auto_skipped'
  | 'analysis_started'
  | 'analysis_succeeded'
  | 'analysis_failed'
  | 'verification_failed'
  | 'pr_opened'

const transitions: Record<IssueStatus, Partial<Record<IssueTransitionEvent, IssueStatus>>> = {
  new: {
    queued: 'queued',
    auto_skipped: 'auto_skipped',
    analysis_started: 'analyzing',
  },
  queued: {
    analysis_started: 'analyzing',
    auto_skipped: 'auto_skipped',
  },
  auto_skipped: {},
  analyzing: {
    analysis_succeeded: 'fix_suggested',
    analysis_failed: 'ignored',
  },
  fix_suggested: {
    verification_failed: 'verification_failed',
    pr_opened: 'pr_opened',
  },
  verification_failed: {},
  pr_opened: {},
  ignored: {},
}

export function nextIssueState(current: IssueStatus, event: IssueTransitionEvent): IssueStatus {
  const next = transitions[current][event]

  if (!next) {
    throw new Error(`Invalid issue transition: ${current} -> ${event}`)
  }

  return next
}
