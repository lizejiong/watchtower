import type { PatchGenerationInput } from './types.js'

export function buildPatchGenerationPrompt(input: PatchGenerationInput) {
  const context = input.codeContext
    .map(file => `File: ${file.path}\n\`\`\`ts\n${file.content}\n\`\`\``)
    .join('\n\n')

  return [
    'You are preparing a minimal patch for an automated draft PR.',
    'Return JSON only and keep the diff scoped to the suspect files.',
    '',
    `Repository: ${input.repository.name}`,
    `Base branch: ${input.repository.defaultBranch}`,
    `Issue title: ${input.issue.title}`,
    `Issue culprit: ${input.issue.culprit ?? 'unknown'}`,
    `Issue level: ${input.issue.level ?? 'unknown'}`,
    '',
    `Analysis summary: ${input.analysis.summary}`,
    `Root cause: ${input.analysis.rootCause}`,
    `Fixable: ${input.analysis.fixable}`,
    `Confidence: ${input.analysis.confidence}`,
    `Suspect files: ${input.analysis.suspectFiles.join(', ')}`,
    `Fix plan: ${input.analysis.fixPlan.join('; ')}`,
    `Verification plan: ${input.analysis.verificationPlan.join('; ')}`,
    '',
    'Code context:',
    context,
    '',
    'Return a unified diff, a short summary, a branchName prefixed with "watchtower/", and a commitMessage.',
  ].join('\n')
}
