# ai-code Sentry Onboarding

This document records the first target repository integration for Watchtower.

## Repository

- Name: `ai-code`
- Local path: `C:\Users\48150\Desktop\mycode\ai-code`
- Remote URL: `https://github.com/lzj2000/ai-code.git`
- Default branch: `main`
- Provider: `github`

## Sentry Setup

The `ai-code` repository now uses the official `@sentry/nextjs` SDK.

Files added:

- `C:\Users\48150\Desktop\mycode\ai-code\instrumentation.ts`
- `C:\Users\48150\Desktop\mycode\ai-code\instrumentation-client.ts`
- `C:\Users\48150\Desktop\mycode\ai-code\sentry.server.config.ts`
- `C:\Users\48150\Desktop\mycode\ai-code\sentry.edge.config.ts`
- `C:\Users\48150\Desktop\mycode\ai-code\app\global-error.tsx`
- `C:\Users\48150\Desktop\mycode\ai-code\app\utils\sentry.ts`

Files updated:

- `C:\Users\48150\Desktop\mycode\ai-code\next.config.ts`
- `C:\Users\48150\Desktop\mycode\ai-code\app\api\chat\route.ts`
- `C:\Users\48150\Desktop\mycode\ai-code\app\services\chat.service.ts`
- `C:\Users\48150\Desktop\mycode\ai-code\.env.example`

## Environment Variables

Add these values in `ai-code/.env` or the deployment environment:

```bash
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=1
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1
SENTRY_ENVIRONMENT=development
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

For the MVP, `NEXT_PUBLIC_SENTRY_DSN` is the only required value to start capturing errors.

## Watchtower Registration

Once `apps/api` is running on `http://localhost:4000`, register the repository with:

```bash
curl -X POST http://localhost:4000/repositories ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"ai-code\",\"localPath\":\"C:\\\\Users\\\\48150\\\\Desktop\\\\mycode\\\\ai-code\",\"remoteUrl\":\"https://github.com/lzj2000/ai-code.git\",\"defaultBranch\":\"main\",\"provider\":\"github\",\"sentryOrgSlug\":\"demo-org\",\"sentryProjectSlug\":\"ai-code-web\",\"autoRepairEnabled\":true,\"autoRepairRules\":{\"minLevel\":\"error\",\"allowFrameworks\":[\"nextjs\"]},\"verificationCmds\":[\"pnpm lint\",\"pnpm build\"]}"
```

## Verification Baseline

Commands run on April 16, 2026:

- `pnpm -C C:\Users\48150\Desktop\mycode\ai-code lint`
- `pnpm -C C:\Users\48150\Desktop\mycode\ai-code build`

Results:

- `lint` passes with 5 pre-existing warnings unrelated to the Sentry integration.
- `build` passes.
- `build` still emits non-blocking `baseline-browser-mapping` warnings.
- `build` still emits 2 non-blocking Turbopack warnings about `import-in-the-middle` version resolution inside the Sentry/OpenTelemetry stack.

## Observability Scope

The MVP integration captures:

- Browser and server errors through the official Next.js SDK
- App Router request errors through `instrumentation.ts`
- React root errors through `app/global-error.tsx`
- `/api/chat` request and stream failures
- Manual tracing spans in `chat.service.ts` for:
  - thread resolution
  - agent bootstrap
  - stream execution
  - final state fetch
- Tool call breadcrumbs and tool error captures
