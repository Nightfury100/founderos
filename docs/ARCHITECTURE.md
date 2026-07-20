# FounderOS — Architecture

Status: **Living document.** Updated at the end of every milestone.

## 1. What FounderOS is

FounderOS is the founder's AI Chief of Staff: a set of autonomous AI agents that
continuously discover, research, qualify, and draft opportunities (jobs,
investors, grants, sales leads, content, inbox triage), and place fully-prepared
work into a prioritized queue. A human Virtual Assistant executes the queue.
The founder only reviews, decides, and attends meetings.

Three roles, three jobs:
- **AI agents** — think, research, draft, score, recommend.
- **VA** — execute what's queued (copy/paste, submit, schedule, update status).
- **Founder** — approve, decide, show up to meetings.

Built as an internal tool for one founder + one VA today, but architected as a
multi-tenant SaaS product from commit one — every entity is tenant-scoped, auth
is role-based (not hardcoded to "the founder"), and nothing assumes a single
user.

## 2. Guiding architectural principles

1. **Modularity over monolith.** Each agent is an independent, swappable
   service with a narrow contract. Agents never call each other directly —
   they communicate through the opportunity lifecycle (state + events) in the
   shared database.
2. **Opaque AI output is a bug.** Every AI-generated record (`AiDecision`)
   carries confidence score, reasoning, sources, recommended next action, the
   generated draft, and a risk level. If an agent can't populate all six, it
   doesn't get to write to the queue.
3. **Human approval is a gate, not an afterthought.** Anything irreversible
   (sending an email, publishing a post, submitting an application) requires
   an explicit `APPROVED` status transition performed by a human. Agents
   propose; humans (or an explicit auto-approval policy) dispose.
4. **One lifecycle, many opportunity types.** Jobs, investors, grants, sales
   leads, and content all move through the same
   `Discover → Research → Qualify → Recommend → Draft → Queue → Execute → Follow-up → Complete → Analytics`
   pipeline. Model it once (`Opportunity` + `OpportunityType`), not five times.
5. **Multi-tenant from day one.** Every domain table carries a
   `workspaceId`. Row-level scoping is enforced in the data-access layer, not
   bolted on later. V1 provisions exactly one workspace (the founder's), but
   the schema and API never assume there's only one.
6. **Boring, swappable infrastructure.** Prefer well-understood, self-hostable
   building blocks (Postgres, Redis, BullMQ) over novel managed platforms for
   the core, so the system isn't hostage to a single vendor's roadmap. Vendor
   integrations (Gmail, LinkedIn, Calendar, Claude) sit behind adapter
   interfaces in `packages/integrations` so they can be swapped without
   touching agent logic.
7. **Type safety end-to-end.** TypeScript everywhere, Prisma-generated types
   from the DB up through a typed API layer (tRPC) to the frontend. No `any`
   at module boundaries.
8. **Test before you build the next module.** Each milestone ships with tests
   for what it adds and must pass CI before the next milestone starts.

## 3. High-level system diagram

```
                         ┌─────────────────────────────┐
                         │        apps/web (Next.js)    │
                         │  Dashboard · Kanban · Queue   │
                         │  Auth (RBAC) · Approvals UI   │
                         └───────────────┬──────────────┘
                                         │ tRPC (typed)
                         ┌───────────────▼──────────────┐
                         │        apps/api (tRPC)        │
                         │  Domain services · Policies   │
                         │  Auth guards · Audit logging   │
                         └───────┬───────────────┬───────┘
                                 │               │
                    ┌────────────▼───┐   ┌───────▼────────────┐
                    │   packages/db   │   │  apps/worker (BullMQ)│
                    │ Prisma / Postgres│  │  Scheduled + event    │
                    └────────────────┘   │  driven agent jobs     │
                                          └──────────┬─────────────┘
                                                      │
                              ┌───────────────────────┼───────────────────────┐
                              │                        │                       │
                     ┌────────▼───────┐      ┌─────────▼────────┐   ┌─────────▼────────┐
                     │ packages/agents │      │ packages/integrations│ │ packages/core     │
                     │ Jobs·Investor·  │      │ Gmail·Calendar·Claude │ │ Lifecycle·Types· │
                     │ Grants·Sales·   │      │ LinkedIn·Web search   │ │ AiDecision schema│
                     │ Email·Marketing·│      └───────────────────┘   └──────────────────┘
                     │ Research        │
                     └─────────────────┘
```

## 4. Repo layout (Turborepo monorepo)

```
founderos/
  apps/
    web/          Next.js 14 (App Router) — dashboard, kanban, queue, approvals
    api/          tRPC routers, auth, domain services, audit logging
    worker/       BullMQ workers — scheduled discovery jobs, agent pipelines
  packages/
    db/           Prisma schema, migrations, generated client
    core/         Shared domain types: lifecycle, AiDecision envelope, enums
    agents/       One module per agent (jobs, investor, grants, sales, email,
                   marketing, research), each behind a common Agent interface
    integrations/ Adapters for Gmail, Calendar, LinkedIn, web search, Claude
    ui/           Shared shadcn/ui component library
    config/       Shared tsconfig, eslint, prettier presets
  docs/           Architecture, technical spec, milestones (this folder)
```

Why Turborepo + pnpm: incremental builds/caching across apps and packages,
strict dependency boundaries (an agent can't accidentally import a Next.js
component), and a single place to add a second frontend (e.g. a mobile app)
later without restructuring.

## 5. Core domain model (see TECHNICAL_SPEC.md for full schema)

Everything a founder deals with is an **Opportunity** with a `type`
(`JOB`, `INVESTOR`, `GRANT`, `SALES_LEAD`, `CONTENT`, `EMAIL_ACTION`) and a
`stage` matching the universal lifecycle. Type-specific data lives in
one-to-one detail tables (`JobDetail`, `InvestorDetail`, `GrantDetail`, ...)
so the core table stays lean and queryable, while each agent's specialized
fields don't pollute a shared blob column.

Every AI-authored artifact — a score, a draft, a recommendation — is stored
as an `AiDecision` row linked to the opportunity it concerns, never as an
untracked side effect. This is what makes "never produce opaque output"
enforceable in code rather than just a policy.

## 6. Agent framework

Each agent (`packages/agents/*`) implements:

```ts
interface Agent<TInput, TOutput> {
  key: AgentKey;                 // e.g. "jobs.discover"
  run(input: TInput, ctx: AgentContext): Promise<AgentResult<TOutput>>;
}
```

`AgentContext` provides: scoped Prisma client, the Claude client, integration
adapters, and a logger. `AgentResult` always wraps output in the
`AiDecision` envelope (confidence, reasoning, sources, nextAction, draft,
riskLevel) before it's persisted — this is enforced by a shared
`recordDecision()` helper in `packages/core`, not left to each agent to
remember.

Agents run two ways:
- **Scheduled** (cron via BullMQ repeatable jobs) — e.g. "discover new
  investor matches every morning."
- **Event-driven** — e.g. a new inbound email triggers the Email Agent's
  triage step.

Long-running, multi-step agent workflows (discover → research → qualify →
draft) are modeled as a chain of small BullMQ jobs that each write one
lifecycle transition, rather than one monolithic function — this keeps each
step independently retryable, observable, and testable, and lets a human
approval gate sit between any two steps without special-casing.

## 7. Why BullMQ + Redis over a managed workflow platform

Considered Inngest / Trigger.dev (great DX for durable AI workflows) vs.
BullMQ + Redis (self-hosted, standard, full control). Chose BullMQ because:
- No vendor lock-in for the core execution engine of a product meant to run
  for years and eventually serve other tenants' data.
- Redis + BullMQ is well-understood, cheap to run, and easy to reason about
  operationally (retries, backoff, dead-letter queues, rate limiting).
- The chain-of-small-jobs pattern above gets us most of the durability
  benefits of a workflow engine without adopting one.

This is revisited if agent workflows grow complex enough (deep branching,
long human-wait steps) that hand-rolled orchestration becomes the bottleneck
— the `Agent` interface is designed so the execution engine underneath it
can be swapped without changing agent logic.

## 8. Security model

- **AuthN**: NextAuth (Auth.js) — credentials for V1 (founder + VA accounts),
  designed to add OAuth/SSO providers later without schema changes.
- **AuthZ**: Role-based (`FOUNDER`, `VA`, `ADMIN` in V1; extensible) enforced
  in the tRPC middleware layer (`packages/api`), never trusted from the
  client.
- **Multi-tenancy isolation**: every query goes through a workspace-scoped
  Prisma client wrapper; there is no code path that queries across
  workspaces except platform-admin tooling.
- **Secrets**: environment variables only, validated at boot with a typed
  schema (`packages/core/env.ts`, zod). Nothing hardcoded. `.env.example`
  documents every required var; real values never committed.
- **Audit log**: every mutating action (human or agent) writes a `Log` row —
  actor, action, entity, before/after, timestamp.
- **Rate limiting**: outbound integration calls (Gmail, LinkedIn, web search,
  Claude) go through a shared rate-limited client in
  `packages/integrations` with backoff and circuit breaking.
- **Irreversible actions require approval**: enforced at the service layer,
  not just the UI — sending email / publishing content / submitting an
  application transitions require `approvedBy` to be set.

## 9. Deployment target (recommendation, revisit at Milestone 1 exit)

- `apps/web` + `apps/api`: containerized, deployed to Fly.io or Railway
  (Vercel is an option for `apps/web` alone, but `apps/worker` needs a
  long-lived process, so a single container-based platform for web+api+worker
  keeps ops simple for V1).
- Postgres: managed (Neon / RDS / Railway Postgres).
- Redis: managed (Upstash / Railway Redis).
- CI: GitHub Actions — lint, typecheck, unit tests on every PR.

## 10. Non-goals for V1

- No self-serve multi-tenant signup flow (schema supports it; onboarding
  flow does not exist yet).
- No mobile app.
- No autonomous sending/publishing without human approval, anywhere.
