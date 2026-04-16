export async function analyzeIssueJob(input: { issueId: string }) {
  return {
    issueId: input.issueId,
    status: 'analysis_started',
  }
}
