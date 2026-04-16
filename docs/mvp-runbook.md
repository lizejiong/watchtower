# Watchtower MVP Runbook

This runbook describes how to start the local Watchtower MVP and how to validate the end-to-end flow.

## Scope

The local MVP flow is:

`ai-code -> Sentry cloud -> Watchtower poller -> auto-repair policy check -> AI analysis -> lint/build gate -> GitHub draft PR`

The first target repository is:

- `C:\Users\48150\Desktop\mycode\ai-code`

## Prerequisites

- Node.js 20+
- pnpm 10+
- `watchtower` workspace dependencies installed
- local git credentials configured for commit/push
- `ai-code` repository available at the configured local path

Optional for the full local stack:

- Docker Desktop for PostgreSQL and Redis

## Environment

Create a local `.env` from the root `.env.example`.

Important values:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/watchtower
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=
GITHUB_TOKEN=
SENTRY_AUTH_TOKEN=
SENTRY_BASE_URL=https://sentry.io
SENTRY_POLL_INTERVAL_MS=60000
WATCHTOWER_WORKTREE_ROOT=
WATCHTOWER_API_BASE_URL=http://localhost:4000
AI_CODE_PATH=C:\Users\48150\Desktop\mycode\ai-code
```

Notes:

- `AI_CODE_PATH` is the base clone for the target repository.
- `WATCHTOWER_WORKTREE_ROOT` is optional. When set, Watchtower creates temporary git worktrees there during patch execution.

## Fast Verification

Use the fixture-based smoke script when you want a deterministic local check without calling real OpenAI or GitHub services.

```bash
pnpm smoke
```

What it does:

- boots the Fastify API in-process
- registers the `ai-code` repository
- injects a Sentry issue payload
- verifies that the issue moves into `queued`
- runs the worker analysis job with fixtures
- runs the verification gate with fixture command results
- opens a fixture draft PR
- asserts that the issue ends in `pr_opened`

This path does not require:

- Docker
- a live Sentry project
- a real OpenAI API key
- a real GitHub token
- a real Sentry API token

## Full Local Stack

Use this mode when you want to inspect the dashboard and let the worker poll real Sentry issues.

### 1. Start infrastructure

```bash
docker compose up -d
```

If Docker is not available on the machine, skip this and use `pnpm smoke` instead.

### 2. Start Watchtower services

Open three terminals:

```bash
pnpm dev:api
pnpm dev:worker
pnpm dev:dashboard
```

The worker now polls Sentry on the interval configured by `SENTRY_POLL_INTERVAL_MS`.
Patch application, verification, and git push now run inside temporary worktrees instead of mutating `AI_CODE_PATH` directly.

### 3. Register the target repository

```bash
curl -X POST http://localhost:4000/repositories ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"ai-code\",\"localPath\":\"C:\\\\Users\\\\48150\\\\Desktop\\\\mycode\\\\ai-code\",\"remoteUrl\":\"https://github.com/lzj2000/ai-code.git\",\"defaultBranch\":\"main\",\"provider\":\"github\",\"sentryOrgSlug\":\"demo-org\",\"sentryProjectSlug\":\"ai-code-web\",\"autoRepairEnabled\":true,\"autoRepairRules\":{\"minLevel\":\"error\",\"allowFrameworks\":[\"nextjs\"]},\"verificationCmds\":[\"pnpm lint\",\"pnpm build\"]}"
```

Expected result:

- `201 Created`

### 4. Open the dashboard

Open:

- `http://localhost:3000`

Check:

- issue list page loads
- repository page loads
- issue detail pages render when issue ids exist

### 5. Trigger a real Sentry error

Cause a real error in `ai-code` that reaches Sentry, then wait for the worker interval to pick it up.

Recommended check:

- verify the issue appears in Sentry first
- wait up to one poll interval
- refresh `http://localhost:3000`

### 6. Observe status progression

Expected issue states in the happy path:

- `queued`
- `analyzing`
- `fix_suggested`
- `pr_opened`

Expected side path:

- `auto_skipped`

If you still want a manual fallback during development, `POST /webhooks/sentry` remains available for fixture-style payload injection.

## Verification Commands

Use these commands before claiming the stack is healthy:

```bash
pnpm test
pnpm lint
pnpm build
pnpm smoke
```

## Known Limits

- `ai-code` uses `pnpm lint` and `pnpm build` as the MVP verification gate. It does not yet have a real automated test suite.
- The current fixture smoke flow does not call live OpenAI or GitHub APIs.
- The current runtime now polls Sentry directly and consumes the `issue-analysis` queue using temporary worktrees.
- Branch naming is still deterministic. Retrying the same issue after a successful push may need an explicit branch replacement policy if you want automatic re-open flows.
- The local machine may still show non-blocking `baseline-browser-mapping` warnings during Next.js builds.
- `ai-code` with Sentry on Next.js 16 + Turbopack may still show non-blocking `import-in-the-middle` version warnings in some environments.
