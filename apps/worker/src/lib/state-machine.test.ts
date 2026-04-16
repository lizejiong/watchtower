import { describe, expect, it } from 'vitest'
import { nextIssueState } from './state-machine.js'

describe('nextIssueState', () => {
  it('moves a new issue into analyzing after queue dispatch', () => {
    expect(nextIssueState('new', 'analysis_started')).toBe('analyzing')
  })
})
