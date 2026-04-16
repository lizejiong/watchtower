# Watchtower MVP 实施计划

> **面向 Agent 执行者：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐步执行本计划。所有步骤使用复选框（`- [ ]`）进行追踪。

**目标：** 构建一个最小可用的端到端错误监控与 AI 辅助提 PR 平台，使用 Sentry 负责采集，并将 `ai-code` 作为首个接入的目标仓库。第一版采用“自动触发修复，但带安全闸门”的模式。

**架构：** `apps/dashboard` 提供运营管理界面，`apps/api` 负责接收 webhook 并提供查询/配置接口，`apps/worker` 负责异步分析、本地 git 操作、验证以及创建 PR。Sentry 是事件采集和 issue 聚合的事实来源；Watchtower 负责将同步后的 issue 状态、分析结果、任务历史和仓库配置保存到 PostgreSQL，后续托管环境可平滑切换到 Supabase Postgres。

**技术栈：** TypeScript、pnpm workspaces、Next.js、Fastify、BullMQ、Redis、PostgreSQL（本地）/ Supabase Postgres（后续托管）、Prisma、Sentry、OpenAI Responses API、GitHub REST API

---

## 文件结构

- `package.json`
  - 工作区根脚本，统一管理 `dev`、`build`、`lint`、`test` 和本地服务启动。
- `pnpm-workspace.yaml`
  - Workspace 包布局定义。
- `docker-compose.yml`
  - 本地 MVP 开发所需的 PostgreSQL 和 Redis；后续线上数据库托管可切到 Supabase。
- `apps/dashboard/`
  - Next.js 运营管理台。
- `apps/api/`
  - Fastify API，负责 Sentry webhook、仓库配置、issue 查询和任务操作。
- `apps/worker/`
  - 队列消费者，负责同步、分析、补丁生成、验证和创建 PR。
- `packages/contracts/`
  - 共享的 Zod schema 和 TypeScript DTO。
- `packages/db/`
  - Prisma schema、迁移和生成的数据库客户端。
- `packages/core/`
  - 共享业务逻辑，包括 issue 状态流转、prompt 构造和结果整形。
- `packages/integrations/`
  - Sentry、GitHub、git 和 OpenAI 集成适配层。
- `scripts/smoke/`
  - 根目录 smoke 脚本，用一条最小链路验证 webhook、worker 和 PR 编排。
- `docs/`
  - 接入说明、环境变量样例和运行手册。

## 前提假设

- 第一个接入的目标仓库是 `C:\Users\48150\Desktop\mycode\ai-code`。
- 第一版代码托管平台只支持 GitHub。
- 第一版监控后端只支持 Sentry Cloud。
- 第一版本地开发数据库使用 PostgreSQL，后续部署数据库优先迁移到 Supabase Postgres。
- 自动修复默认开启自动触发，但只创建 `draft PR`，不自动合并。
- 自动触发必须先经过修复策略判断；不满足条件的 issue 只落库，不进入修复队列。
- `ai-code` 的 MVP 验证闸门为 `pnpm lint` + `pnpm build`。
- 默认不持久化完整 prompt/response 内容，只存摘要和派生元数据。

## V1 主链路

`Sentry 报错 -> Watchtower 同步 issue -> 自动判断是否满足修复策略 -> AI 分析并生成补丁 -> 跑 lint/build -> 提 GitHub draft PR`

不满足自动修复条件的 issue 走旁路：

`Sentry 报错 -> Watchtower 同步 issue -> 标记为 auto_skipped -> 在 dashboard 中查看`

## 自动触发策略

第一版建议默认只对满足以下条件的 issue 自动触发修复：

- 仓库已启用 `autoRepairEnabled`
- issue 级别为 `error` 或以上
- issue 属于首批支持的项目类型：`Next.js/TypeScript`
- issue 最近一次事件包含可用堆栈、文件路径或明确 culprit
- issue 不在忽略名单中，且当前没有未关闭的修复 PR
- issue 不属于鉴权失败、三方服务异常、环境变量缺失、数据库连接失败这类高误判问题

第一版明确不自动修复的类型：

- 纯网络波动或第三方依赖故障
- 需要数据库数据修复的问题
- 明显依赖线上配置或密钥的问题
- 没有堆栈、没有 suspect files、没有可定位代码上下文的问题
- 同一个 issue 在短时间内高频重复触发的问题

## 环境与验证收缩策略

- 只维护一套本地开发环境：`watchtower + ai-code + docker compose(PostgreSQL/Redis)`。
- 不再单独维护 `tests/e2e` workspace 包，避免出现第二套测试依赖和第二套运行入口。
- 不再为 Dashboard 单独搭 UI 测试环境；V1 只要求 `build` 通过，并通过 smoke 流程人工确认页面可用。
- 保留的自动化验证只覆盖高风险环节：contracts、API 路由、worker 状态机、AI 结构化输出、GitHub PR 组装。
- 端到端验证收敛为一条根目录 smoke 脚本：启动本地服务后触发一个 webhook，确认 issue 能走完整闭环。
- 不引入独立测试仓库、独立测试数据库或第二个 playground 项目；`ai-code` 就是唯一目标仓库和唯一验证对象。
- V1 只使用一个 Sentry 项目和一套本地 Watchtower 服务，不额外维护 staging/qa 专用监控环境。

### 任务 1：搭建 Monorepo 基础骨架

**文件：**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `docker-compose.yml`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `apps/dashboard/package.json`
- Create: `apps/api/package.json`
- Create: `apps/worker/package.json`
- Create: `packages/contracts/package.json`
- Create: `packages/db/package.json`
- Create: `packages/core/package.json`
- Create: `packages/integrations/package.json`

- [ ] **步骤 1：先写一个失败的工作区启动检查**

```json
{
  "private": true,
  "name": "watchtower",
  "packageManager": "pnpm@10.27.0",
  "scripts": {
    "lint": "pnpm -r lint",
    "build": "pnpm -r build",
    "test": "pnpm -r --if-present test",
    "smoke": "tsx scripts/smoke/full-flow.ts",
    "dev:dashboard": "pnpm --filter @watchtower/dashboard dev",
    "dev:api": "pnpm --filter @watchtower/api dev",
    "dev:worker": "pnpm --filter @watchtower/worker dev"
  }
}
```

- [ ] **步骤 2：运行启动检查，确认在文件尚未存在前会失败**

Run: `pnpm lint`  
Expected: FAIL，提示缺少 workspace package 或脚本。

- [ ] **步骤 3：写入最小可用的 monorepo 脚手架**

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
```

```json
// apps/api/package.json
{
  "name": "@watchtower/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src --ext .ts",
    "test": "vitest run"
  }
}
```

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: watchtower
    ports:
      - "5432:5432"
  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

- [ ] **步骤 4：运行基础命令，确认工作区结构正确**

Run: `pnpm install`  
Expected: PASS，生成 lockfile，所有 workspace package 正常链接。

Run: `docker compose up -d`  
Expected: PASS，`postgres` 和 `redis` 正常启动。

- [ ] **步骤 5：提交**

```bash
git add .
git commit -m "chore: scaffold watchtower workspace"
```

### 任务 2：定义共享契约与数据库模型

**文件：**
- Create: `packages/contracts/src/issues.ts`
- Create: `packages/contracts/src/repositories.ts`
- Create: `packages/contracts/src/jobs.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/prisma/migrations/<timestamp>_init/migration.sql`
- Test: `packages/db/src/client.test.ts`

- [ ] **步骤 1：先写一个失败的 schema 测试**

```ts
import { describe, expect, it } from 'vitest'
import { issueStatusSchema } from '@watchtower/contracts'

describe('issue status schema', () => {
  it('accepts the MVP states', () => {
    expect(issueStatusSchema.parse('new')).toBe('new')
    expect(issueStatusSchema.parse('pr_opened')).toBe('pr_opened')
  })
})
```

- [ ] **步骤 2：运行契约测试，确认先失败**

Run: `pnpm --filter @watchtower/db test`  
Expected: FAIL，提示缺少 contract 导出或缺少测试运行配置。

- [ ] **步骤 3：写入 MVP 所需 contracts 和 Prisma schema**

要求：Prisma schema 必须保持与标准 Postgres 兼容，避免使用后续迁移到 Supabase 时容易产生绑定问题的本地特有能力。

```ts
// packages/contracts/src/issues.ts
import { z } from 'zod'

export const issueStatusSchema = z.enum([
  'new',
  'queued',
  'auto_skipped',
  'analyzing',
  'fix_suggested',
  'verification_failed',
  'pr_opened',
  'ignored',
])
```

```prisma
// packages/db/prisma/schema.prisma
model Repository {
  id                String   @id @default(cuid())
  name              String
  localPath         String
  remoteUrl         String
  defaultBranch     String
  provider          String
  sentryOrgSlug     String
  sentryProjectSlug String
  autoRepairEnabled Boolean  @default(false)
  autoRepairRules   Json?
  verificationCmds  Json
  issues            Issue[]
}

model Issue {
  id               String   @id @default(cuid())
  repositoryId     String
  externalIssueId  String
  title            String
  culprit          String?
  level            String?
  status           String
  fingerprint      String?
  latestEventId    String?
  release          String?
  firstSeenAt      DateTime?
  lastSeenAt       DateTime?
  repository       Repository @relation(fields: [repositoryId], references: [id])
  analyses         AnalysisRun[]

  @@unique([repositoryId, externalIssueId])
}

model AnalysisRun {
  id             String   @id @default(cuid())
  issueId        String
  status         String
  summary        String?
  rootCause      String?
  patchBranch    String?
  prUrl          String?
  confidence     Float?
  verification   Json?
  createdAt      DateTime @default(now())
  issue          Issue    @relation(fields: [issueId], references: [id])
}
```

- [ ] **步骤 4：运行数据库校验流程**

Run: `pnpm --filter @watchtower/db prisma validate`  
Expected: PASS，Prisma schema 校验通过。

Run: `pnpm --filter @watchtower/db test`  
Expected: PASS，contract 测试通过。

- [ ] **步骤 5：提交**

```bash
git add packages/contracts packages/db
git commit -m "feat: add watchtower contracts and schema"
```

### 任务 3：搭建 API 骨架，支持 Webhook、查询和仓库配置

**文件：**
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/plugins/env.ts`
- Create: `apps/api/src/plugins/db.ts`
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/routes/repositories.ts`
- Create: `apps/api/src/routes/issues.ts`
- Create: `apps/api/src/routes/webhooks/sentry.ts`
- Create: `apps/api/src/lib/sentry-signature.ts`
- Test: `apps/api/src/routes/repositories.test.ts`
- Test: `apps/api/src/routes/webhooks/sentry.test.ts`

- [ ] **步骤 1：先写一个失败的仓库配置路由测试**

```ts
import { describe, expect, it } from 'vitest'
import { buildApp } from '../app'

describe('POST /repositories', () => {
  it('creates a repository config', async () => {
    const app = await buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/repositories',
      payload: {
        name: 'ai-code',
        localPath: 'C:\\Users\\48150\\Desktop\\mycode\\ai-code',
        remoteUrl: 'https://github.com/lzj2000/ai-code.git',
        defaultBranch: 'main',
        provider: 'github',
        sentryOrgSlug: 'demo-org',
        sentryProjectSlug: 'ai-code-web',
        autoRepairEnabled: true,
        autoRepairRules: {
          minLevel: 'error',
          allowFrameworks: ['nextjs'],
        },
        verificationCmds: ['pnpm lint', 'pnpm build']
      }
    })

    expect(response.statusCode).toBe(201)
  })
})
```

- [ ] **步骤 2：运行 API 测试，确认先失败**

Run: `pnpm --filter @watchtower/api test`  
Expected: FAIL，提示缺少 app builder 或路由实现。

- [ ] **步骤 3：实现最小可用的 Fastify API**

```ts
// apps/api/src/routes/health.ts
export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true }))
}
```

```ts
// apps/api/src/routes/webhooks/sentry.ts
app.post('/webhooks/sentry', async (request, reply) => {
  const event = sentryWebhookSchema.parse(request.body)
  await queueIssueSync(event)
  return reply.code(202).send({ accepted: true })
})
```

```ts
// apps/api/src/routes/repositories.ts
app.post('/repositories', async (request, reply) => {
  const input = repositoryCreateSchema.parse(request.body)
  const repository = await prisma.repository.create({ data: input })
  return reply.code(201).send(repository)
})
```

- [ ] **步骤 4：运行 API 验证**

Run: `pnpm --filter @watchtower/api test`  
Expected: PASS，仓库配置和 webhook 测试通过。

Run: `pnpm --filter @watchtower/api build`  
Expected: PASS，生成 `dist/server.js`。

- [ ] **步骤 5：提交**

```bash
git add apps/api
git commit -m "feat: add api skeleton for repository config and sentry webhooks"
```

### 任务 4：增加 Worker 队列、Issue 同步和状态机

**文件：**
- Create: `apps/worker/src/worker.ts`
- Create: `apps/worker/src/queues.ts`
- Create: `apps/worker/src/jobs/sync-issue.ts`
- Create: `apps/worker/src/jobs/analyze-issue.ts`
- Create: `apps/worker/src/jobs/open-pr.ts`
- Create: `apps/worker/src/lib/state-machine.ts`
- Modify: `apps/api/src/routes/webhooks/sentry.ts`
- Test: `apps/worker/src/jobs/sync-issue.test.ts`
- Test: `apps/worker/src/lib/state-machine.test.ts`

- [ ] **步骤 1：先写一个失败的状态流转测试**

```ts
import { describe, expect, it } from 'vitest'
import { nextIssueState } from '../lib/state-machine'

describe('nextIssueState', () => {
  it('moves a new issue into analyzing after queue dispatch', () => {
    expect(nextIssueState('new', 'analysis_started')).toBe('analyzing')
  })
})
```

- [ ] **步骤 2：运行 worker 测试，确认先失败**

Run: `pnpm --filter @watchtower/worker test`  
Expected: FAIL，提示缺少队列或状态机实现。

- [ ] **步骤 3：实现队列接线和 issue 同步**

```ts
// apps/worker/src/queues.ts
export const queues = {
  issueSync: new Queue('issue-sync', { connection }),
  issueAnalysis: new Queue('issue-analysis', { connection }),
  prOpen: new Queue('pr-open', { connection }),
}
```

```ts
// apps/worker/src/jobs/sync-issue.ts
export async function syncIssueJob(payload: SentryWebhookPayload) {
  const issue = await upsertIssueFromSentry(payload)
  if (!(await shouldAutoRepair(issue.id))) {
    await markIssueAutoSkipped(issue.id)
    return
  }
  await queues.issueAnalysis.add('analyze', { issueId: issue.id })
}
```

```ts
// apps/worker/src/lib/state-machine.ts
const transitions = {
  new: { queued: 'queued', auto_skipped: 'auto_skipped', analysis_started: 'analyzing' },
  analyzing: { analysis_succeeded: 'fix_suggested', analysis_failed: 'ignored' },
  fix_suggested: { verification_failed: 'verification_failed', pr_opened: 'pr_opened' },
} as const
```

- [ ] **步骤 4：运行 worker 验证**

Run: `pnpm --filter @watchtower/worker test`  
Expected: PASS，issue 同步和状态机测试通过。

- [ ] **步骤 5：提交**

```bash
git add apps/worker apps/api/src/routes/webhooks/sentry.ts
git commit -m "feat: add worker queue and issue sync pipeline"
```

### 任务 5：实现 AI 分析输出和 Prompt 结构

**文件：**
- Create: `packages/core/src/analysis/prompt.ts`
- Create: `packages/core/src/analysis/types.ts`
- Create: `packages/core/src/analysis/schema.ts`
- Create: `packages/integrations/src/openai/client.ts`
- Create: `packages/integrations/src/openai/analyze-issue.ts`
- Modify: `apps/worker/src/jobs/analyze-issue.ts`
- Test: `packages/core/src/analysis/schema.test.ts`
- Test: `packages/integrations/src/openai/analyze-issue.test.ts`

- [ ] **步骤 1：先写一个失败的分析 schema 测试**

```ts
import { describe, expect, it } from 'vitest'
import { analysisResultSchema } from './schema'

describe('analysisResultSchema', () => {
  it('requires suspect files and a fixability decision', () => {
    const parsed = analysisResultSchema.parse({
      summary: 'Null access in chat route',
      rootCause: 'thread_id is used before validation',
      suspectFiles: ['app/api/chat/route.ts'],
      fixable: true,
      confidence: 0.82,
      fixPlan: ['Guard missing thread_id', 'Add route-level error handling']
    })

    expect(parsed.fixable).toBe(true)
  })
})
```

- [ ] **步骤 2：运行 schema 测试，确认先失败**

Run: `pnpm --filter @watchtower/core test`  
Expected: FAIL，提示缺少 analysis schema。

- [ ] **步骤 3：实现结构化 AI 分析输出**

```ts
// packages/core/src/analysis/schema.ts
export const analysisResultSchema = z.object({
  summary: z.string().min(1),
  rootCause: z.string().min(1),
  suspectFiles: z.array(z.string()).min(1),
  fixable: z.boolean(),
  confidence: z.number().min(0).max(1),
  fixPlan: z.array(z.string()).min(1),
  verificationPlan: z.array(z.string()).min(1),
})
```

```ts
// packages/integrations/src/openai/analyze-issue.ts
const prompt = buildIssueAnalysisPrompt({ issue, event, repository })
const response = await openai.responses.parse({
  model: 'gpt-5.4',
  input: prompt,
  text: {
    format: zodTextFormat(analysisResultSchema, 'analysis_result'),
  },
})
return response.output_parsed
```

- [ ] **步骤 4：运行 AI 集成验证**

Run: `pnpm --filter @watchtower/core test`  
Expected: PASS，schema 测试通过。

Run: `pnpm --filter @watchtower/worker test`  
Expected: PASS，analysis job 在 mock OpenAI 调用下测试通过。

- [ ] **步骤 5：提交**

```bash
git add packages/core packages/integrations apps/worker/src/jobs/analyze-issue.ts
git commit -m "feat: add structured ai issue analysis"
```

### 任务 6：实现本地 Git 补丁生成与验证闸门

**文件：**
- Create: `packages/integrations/src/git/local-repo.ts`
- Create: `packages/integrations/src/git/worktree.ts`
- Create: `packages/core/src/patch/prompt.ts`
- Create: `packages/integrations/src/openai/generate-patch.ts`
- Create: `apps/worker/src/jobs/verify-fix.ts`
- Modify: `apps/worker/src/jobs/analyze-issue.ts`
- Test: `packages/integrations/src/git/local-repo.test.ts`
- Test: `apps/worker/src/jobs/verify-fix.test.ts`

- [ ] **步骤 1：先写一个失败的验证闸门测试**

```ts
import { describe, expect, it } from 'vitest'
import { pickVerificationCommands } from '../jobs/verify-fix'

describe('pickVerificationCommands', () => {
  it('returns the configured ai-code gate', () => {
    expect(
      pickVerificationCommands({
        verificationCmds: ['pnpm lint', 'pnpm build']
      }),
    ).toEqual(['pnpm lint', 'pnpm build'])
  })
})
```

- [ ] **步骤 2：运行验证测试，确认先失败**

Run: `pnpm --filter @watchtower/worker test`  
Expected: FAIL，提示缺少 `verify-fix` 实现。

- [ ] **步骤 3：实现补丁生成和本地验证**

```ts
// packages/integrations/src/git/worktree.ts
export async function preparePatchBranch(input: {
  repoPath: string
  branchName: string
  baseBranch: string
}) {
  await execa('git', ['-C', input.repoPath, 'fetch', 'origin', input.baseBranch])
  await execa('git', ['-C', input.repoPath, 'switch', '-c', input.branchName, `origin/${input.baseBranch}`])
}
```

```ts
// apps/worker/src/jobs/verify-fix.ts
for (const command of repository.verificationCmds as string[]) {
  const result = await execa(command, { cwd: repository.localPath, shell: true, reject: false })
  records.push({ command, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr })
  if (result.exitCode !== 0) return { ok: false, records }
}
return { ok: true, records }
```

- [ ] **步骤 4：运行验证流程检查**

Run: `pnpm --filter @watchtower/worker test`  
Expected: PASS，验证闸门相关测试通过。

- [ ] **步骤 5：提交**

```bash
git add packages/integrations packages/core apps/worker/src/jobs/verify-fix.ts
git commit -m "feat: add local patch generation and verification gate"
```

### 任务 7：实现 GitHub Draft PR 创建

**文件：**
- Create: `packages/integrations/src/github/client.ts`
- Create: `packages/integrations/src/github/open-draft-pr.ts`
- Modify: `apps/worker/src/jobs/open-pr.ts`
- Modify: `packages/contracts/src/jobs.ts`
- Test: `packages/integrations/src/github/open-draft-pr.test.ts`

- [ ] **步骤 1：先写一个失败的 PR 内容测试**

```ts
import { describe, expect, it } from 'vitest'
import { buildPullRequestBody } from './open-draft-pr'

describe('buildPullRequestBody', () => {
  it('includes issue, analysis, and verification summary', () => {
    const body = buildPullRequestBody({
      issueTitle: 'Chat route crashes on missing thread',
      sentryIssueUrl: 'https://sentry.io/issues/123',
      summary: 'Missing validation before stream setup',
      verification: [
        { command: 'pnpm lint', exitCode: 0 },
        { command: 'pnpm build', exitCode: 0 },
      ],
    })

    expect(body).toContain('Sentry Issue')
    expect(body).toContain('Verification')
  })
})
```

- [ ] **步骤 2：运行 PR 集成测试，确认先失败**

Run: `pnpm --filter @watchtower/integrations test`  
Expected: FAIL，提示缺少 GitHub PR 辅助实现。

- [ ] **步骤 3：实现 draft PR 创建**

```ts
// packages/integrations/src/github/open-draft-pr.ts
await octokit.rest.pulls.create({
  owner,
  repo,
  title: `fix: ${issue.title}`,
  head: branchName,
  base: repository.defaultBranch,
  body: buildPullRequestBody(input),
  draft: true,
})
```

```ts
// apps/worker/src/jobs/open-pr.ts
if (!verification.ok) {
  return markAnalysisVerificationFailed(run.id, verification.records)
}
const pr = await openDraftPullRequest(...)
return markAnalysisPrOpened(run.id, pr.html_url)
```

- [ ] **步骤 4：运行 PR 验证**

Run: `pnpm --filter @watchtower/integrations test`  
Expected: PASS，PR 格式化和 GitHub client 测试通过。

- [ ] **步骤 5：提交**

```bash
git add packages/integrations apps/worker/src/jobs/open-pr.ts packages/contracts/src/jobs.ts
git commit -m "feat: add github draft pr automation"
```

### 任务 8：构建运营管理台 Dashboard

**文件：**
- Create: `apps/dashboard/app/layout.tsx`
- Create: `apps/dashboard/app/page.tsx`
- Create: `apps/dashboard/app/issues/[issueId]/page.tsx`
- Create: `apps/dashboard/app/repositories/page.tsx`
- Create: `apps/dashboard/lib/api.ts`
- Create: `apps/dashboard/components/issues-table.tsx`
- Create: `apps/dashboard/components/issue-detail.tsx`
- Create: `apps/dashboard/components/repository-form.tsx`

- [ ] **步骤 1：先明确 Dashboard 只做最小页面，不单独引入 UI 测试环境**

范围限制：

- 只做 issue 列表页、issue 详情页、仓库配置页
- 不做复杂交互测试
- 不单独引入 Playwright、RTL 或额外浏览器测试基建
- V1 只要求 `build` 成功，并在 smoke 验证时人工确认页面可访问

- [ ] **步骤 2：实现 MVP 管理台页面**

```tsx
// apps/dashboard/app/page.tsx
export default async function HomePage() {
  const issues = await getIssues()
  return (
    <main>
      <h1>Watchtower</h1>
      <IssuesTable issues={issues} />
    </main>
  )
}
```

```tsx
// apps/dashboard/app/issues/[issueId]/page.tsx
export default async function IssueDetailPage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params
  const issue = await getIssue(issueId)
  return <IssueDetail issue={issue} />
}
```

- [ ] **步骤 3：运行 dashboard 验证**

Run: `pnpm --filter @watchtower/dashboard build`  
Expected: PASS，dashboard 生产构建通过。

Run: 打开 `http://localhost:3000` 并检查 issue 列表页、issue 详情页、仓库配置页  
Expected: PASS，页面能正常读取 API 数据并展示 `auto_skipped` / `pr_opened` 等状态。

- [ ] **步骤 4：提交**

```bash
git add apps/dashboard
git commit -m "feat: add watchtower operator dashboard"
```

### 任务 9：为 ai-code 接入 Sentry 并在 Watchtower 中注册

**文件：**
- Modify: `C:\Users\48150\Desktop\mycode\ai-code\package.json`
- Create: `C:\Users\48150\Desktop\mycode\ai-code\instrumentation-client.ts`
- Create: `C:\Users\48150\Desktop\mycode\ai-code\sentry.server.config.ts`
- Create: `C:\Users\48150\Desktop\mycode\ai-code\sentry.edge.config.ts`
- Modify: `C:\Users\48150\Desktop\mycode\ai-code\app\api\chat\route.ts`
- Modify: `C:\Users\48150\Desktop\mycode\ai-code\app\services\chat.service.ts`
- Modify: `C:\Users\48150\Desktop\mycode\ai-code\.env.example`
- Create: `docs/ai-code-onboarding.md`

- [ ] **步骤 1：先确认 ai-code 当前 lint/build 基线可用**

```bash
pnpm -C C:\Users\48150\Desktop\mycode\ai-code lint
pnpm -C C:\Users\48150\Desktop\mycode\ai-code build
```

Expected: PASS，在接入 Sentry 前先确认目标仓库基线稳定。

- [ ] **步骤 2：添加最小 Sentry 接入**

```ts
// C:\Users\48150\Desktop\mycode\ai-code\instrumentation-client.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  enabled: process.env.NODE_ENV !== 'development',
})
```

```ts
// C:\Users\48150\Desktop\mycode\ai-code\app\api\chat\route.ts
import * as Sentry from '@sentry/nextjs'

catch (error) {
  Sentry.captureException(error, {
    tags: { route: '/api/chat' },
  })
  throw error
}
```

```ts
// C:\Users\48150\Desktop\mycode\ai-code\app\services\chat.service.ts
await Sentry.startSpan({ name: 'chatService.streamChat', op: 'ai.pipeline' }, async () => {
  // existing LangGraph stream logic
})
```

- [ ] **步骤 3：在 Watchtower 中注册 ai-code**

Run: `curl -X POST http://localhost:4000/repositories -H "Content-Type: application/json" -d "{\"name\":\"ai-code\",\"localPath\":\"C:\\\\Users\\\\48150\\\\Desktop\\\\mycode\\\\ai-code\",\"remoteUrl\":\"https://github.com/lzj2000/ai-code.git\",\"defaultBranch\":\"main\",\"provider\":\"github\",\"sentryOrgSlug\":\"<org>\",\"sentryProjectSlug\":\"<project>\",\"autoRepairEnabled\":true,\"autoRepairRules\":{\"minLevel\":\"error\",\"allowFrameworks\":[\"nextjs\"]},\"verificationCmds\":[\"pnpm lint\",\"pnpm build\"]}"`
Expected: PASS，返回 `201 Created`。

- [ ] **步骤 4：运行 ai-code 验证**

Run: `pnpm -C C:\Users\48150\Desktop\mycode\ai-code lint`  
Expected: PASS。

Run: `pnpm -C C:\Users\48150\Desktop\mycode\ai-code build`  
Expected: PASS。

- [ ] **步骤 5：提交**

```bash
git -C C:\Users\48150\Desktop\mycode\ai-code add .
git -C C:\Users\48150\Desktop\mycode\ai-code commit -m "feat: add sentry monitoring for watchtower"
```

### 任务 10：验证完整 MVP 端到端流程

**文件：**
- Create: `scripts/smoke/full-flow.ts`
- Create: `docs/mvp-runbook.md`
- Modify: `.env.example`

- [ ] **步骤 1：先写一个失败的 smoke 脚本**

```ts
const response = await fetch('http://localhost:4000/webhooks/sentry', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ action: 'triggered', data: { issue: { id: '123' } } }),
})

if (response.status !== 202) {
  throw new Error(`unexpected status: ${response.status}`)
}
```

- [ ] **步骤 2：运行 smoke 脚本，确认在服务未启动前会失败**

Run: `pnpm smoke`  
Expected: FAIL，直到 API、DB 和 worker 一起跑起来。

- [ ] **步骤 3：实现运行手册和基于 fixture 的 smoke 流程**

```md
1. 使用 `docker compose up -d` 启动 PostgreSQL 和 Redis。
2. 使用 `pnpm dev:api` 启动 API。
3. 使用 `pnpm dev:worker` 启动 worker。
4. 使用 `pnpm dev:dashboard` 启动 dashboard。
5. 在 Sentry 中触发一个已知的 ai-code 错误。
6. 确认 issue 状态从 `new` 根据策略流转到 `analyzing` 或 `auto_skipped`。
7. 只有当 `pnpm lint` 和 `pnpm build` 都通过时，才会创建 draft PR。
```

- [ ] **步骤 4：运行完整验证**

Run: `pnpm lint`  
Expected: PASS，所有 package 通过 lint。

Run: `pnpm build`  
Expected: PASS，所有 package 构建通过。

Run: `pnpm test`  
Expected: PASS，保留的单元测试通过。

Run: `pnpm smoke`  
Expected: PASS，单条 smoke 链路验证通过。

- [ ] **步骤 5：提交**

```bash
git add scripts/smoke docs .env.example
git commit -m "docs: add mvp runbook and end-to-end smoke coverage"
```

## 里程碑

1. **基础设施完成**  
   Workspace、数据库 schema、API 骨架和 worker 队列可以在本地运行。
2. **分析闭环完成**  
   Sentry issue webhook 能创建数据库 issue 记录，并基于自动修复策略决定进入分析或标记 `auto_skipped`。
3. **修复闭环完成**  
   Worker 能自动创建补丁分支、运行 `ai-code` 验证命令，并发起 GitHub draft PR。
4. **运营界面完成**  
   Dashboard 能展示仓库配置、issue 列表、issue 详情、分析结果和 PR 链接。

## 风险与控制

- `ai-code` 当前没有正式的自动化测试。
  Control: MVP 阶段只使用 `pnpm lint` 和 `pnpm build` 作为验证闸门，且所有 PR 都保持 draft。
- AI 生成补丁可能置信度低。
  Control: 必须输出结构化置信度、可疑文件列表，并且验证通过后才允许创建 PR。
- 自动触发可能造成噪音 PR。
  Control: 通过 `autoRepairEnabled + autoRepairRules`、issue 去重、未关闭 PR 检查和 `auto_skipped` 状态控制自动化范围。
- Sentry webhook 的 payload 结构可能因配置不同而变化。
  Control: 在 MVP 阶段将原始 webhook payload 以 JSON 形式落库，便于回放。
- 本地 git 操作可能污染目标仓库。
  Control: 使用专用补丁分支；若仓库不是 clean 状态，则立即失败并停止执行。
- 后续迁移到 Supabase 时，数据库连接、迁移流程和鉴权方式会变化。
  Control: 第一阶段只依赖标准 Postgres + Prisma，不把 Supabase Auth、Edge Functions 或特有扩展耦合进核心链路。

## 自检

- 覆盖范围：本计划覆盖了采集、同步、分析、补丁生成、验证、PR 创建、dashboard 和 `ai-code` 接入。
- 占位符扫描：没有遗留 `TODO` 或“后面再处理”这类占位步骤。
- 类型一致性：issue 状态、repository 字段和 verification command 处理在 API、worker 和 dashboard 中保持一致。
