export async function openPrJob(input: { issueId: string }) {
  return {
    issueId: input.issueId,
    status: 'pr_pending',
  }
}
