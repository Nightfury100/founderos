# FounderOS — Technical Specification

Companion to `ARCHITECTURE.md`. This is the detailed reference for the data
model, API surface, and shared contracts. Updated as each milestone lands.

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Monorepo | Turborepo + pnpm workspaces | Caching, clean package boundaries |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui | Fast, typed, well-documented |
| Data fetching | TanStack Query + tRPC | End-to-end type safety, no REST boilerplate |
| API | tRPC on Node (hosted inside `apps/api`) | Typed contracts shared with frontend automatically |
| Database | PostgreSQL | Relational integrity for a genuinely relational domain |
| ORM | Prisma | Type-safe schema, migrations, good DX |
| Job queue | BullMQ + Redis | Self-hosted, retries/backoff/rate-limit built in |
| Auth | NextAuth (Auth.js), credentials provider V1 | Extensible to OAuth/SSO later |
| AI | Claude (Anthropic API), Messages API + tool use | Agent reasoning, drafting, scoring |
| Validation | zod | Runtime validation shared between client/server |
| Testing | Vitest (unit/integration), Playwright (e2e) | Standard, fast |
| Lint/format | ESLint + Prettier | Consistency |
| CI | GitHub Actions | lint, typecheck, test on every PR |

## 2. Data model

### 2.1 Conventions
- All tables: `id` (cuid), `createdAt`, `updatedAt`.
- All tenant-scoped tables: `workspaceId` FK, indexed.
- Enums are Prisma enums (mapped to Postgres enums) — not free-text strings.
- Soft-delete is **not** used by default; use explicit status fields
  (e.g. `ARCHIVED`) so history is queryable. Hard delete only for genuinely
  disposable data (draft-not-yet-sent messages the user discards).

### 2.2 Entity groups

**Identity & tenancy**
- `Workspace` — a tenant. V1 has exactly one, seeded at setup.
- `User` — belongs to a workspace, has a `Role` (`FOUNDER`, `VA`, `ADMIN`).
- `Session`, `Account`, `VerificationToken` — NextAuth standard tables.

**Universal opportunity lifecycle**
- `Opportunity` — the spine. `type` (`OpportunityType` enum: `JOB`,
  `INVESTOR`, `GRANT`, `SALES_LEAD`, `CONTENT`, `EMAIL_ACTION`), `stage`
  (`OpportunityStage` enum matching the lifecycle in section 3), `title`,
  `summary`, `sourceUrl`, `discoveredAt`, `priority`, `workspaceId`.
- `AiDecision` — one row per AI action taken on an opportunity (or
  standalone, e.g. an email triage decision). Fields: `confidence` (0-1),
  `reasoning` (text), `sources` (string[] / JSON), `recommendedNextAction`,
  `draftContent` (nullable — the generated asset, if any), `riskLevel`
  (`LOW`/`MEDIUM`/`HIGH`), `agentKey`, `opportunityId?`, `emailId?`.
- `Task` — a queue item for the VA. `title`, `priority`, `estimatedMinutes`,
  `status` (`TODO`/`IN_PROGRESS`/`BLOCKED`/`DONE`), `requiredAssets` (JSON —
  links to drafts/documents), `nextAction`, `assignedToId`, `opportunityId?`.
- `FollowUp` — scheduled reminder tied to an opportunity or contact:
  `dueAt`, `status`, `note`.

**People & orgs**
- `Company`
- `Contact` — belongs to a `Company`, may link to multiple opportunity types
  (a person can be both a recruiter contact and, unrelated, a sales lead).

**Type-specific detail tables (1:1 with Opportunity where `type` matches)**
- `JobDetail` — role, level, remote/relocation, jobBoardUrl, `recruiterId?`.
- `Recruiter` — links to `Contact`.
- `InvestorDetail` — investorType (`VC`/`ANGEL`/`FAMILY_OFFICE`/`STRATEGIC`/
  `CVC`), thesisSummary, portfolioFitNotes, checkSizeRange.
- `GrantDetail` — program, eligibilityNotes, deadline, amount,
  applicationStatus.
- `Accelerator` — program-level metadata for grant/accelerator opportunities.
- `Lead` (Sales Agent) — business (`ViralX`/`EventIntelligence`/future),
  pipelineStage, dealValue.
- `Meeting` — scheduledAt, attendees, relatedOpportunityId?, notes,
  calendarEventId (external ref).

**Communication**
- `Email` — Gmail message metadata + AI categorization (`category`,
  `isUrgent`, `suggestedAction`), never stores full body long-term beyond
  what's needed for drafting (privacy-conscious; body fetched on demand via
  the Gmail adapter where feasible).
- `Message` — generic outbound message record (LinkedIn outreach, recruiter
  message, investor email) with `channel`, `status`
  (`DRAFT`/`PENDING_APPROVAL`/`APPROVED`/`SENT`/`FAILED`), `approvedById?`.
- `Content` — marketing content items: `platform` (`LINKEDIN`/`INSTAGRAM`),
  `body`, `status` (`DRAFT`/`PENDING_APPROVAL`/`APPROVED`/`SCHEDULED`/
  `PUBLISHED`), `scheduledFor`.

**Knowledge base**
- `Document` — versioned reusable content: bios, pitches, CVs, cover
  letters, SOPs, brand guidelines. `kind` enum, `version` int,
  `isCurrentVersion` boolean, `body`. Only one `isCurrentVersion=true` per
  `(workspaceId, kind, slug)` — enforced at the service layer so agents
  always pull the latest approved version.
- `Template` — reusable prompt/message templates per agent.
- `JobSearchProfile` — one per workspace: target role titles, seniority,
  industries, locations, remote/relocation flags, excluded companies,
  salary range, free-text notes. What the Jobs Agent filters and scores
  discovered roles against; editable from the Knowledge Hub.
- `InvestorSearchProfile` — one per workspace: target investor types
  (`VC`/`ANGEL`/`FAMILY_OFFICE`/`STRATEGIC`/`CVC`), stage focus, sector
  focus, geographies, check size range, free-text notes. What the
  Investor Agent filters and scores discovered investors against.

**Platform**
- `Project` — optional grouping (e.g. a fundraising round, a hiring push).
- `Notification` — in-app/user-facing notices.
- `Log` — audit trail: `actorType` (`USER`/`AGENT`/`SYSTEM`), `actorId`,
  `action`, `entityType`, `entityId`, `before` (JSON), `after` (JSON).
- `Settings` — per-workspace key/value config (feature flags like
  auto-publish, digest time, etc).

Full Prisma schema lives in `packages/db/prisma/schema.prisma` (source of
truth — this doc summarizes it, the schema is authoritative on exact
fields/types).

## 3. Universal lifecycle (`OpportunityStage` enum)

```
DISCOVERED → RESEARCHING → QUALIFYING → RECOMMENDED → DRAFTING →
QUEUED → IN_PROGRESS → FOLLOW_UP → COMPLETED
                                  ↘ REJECTED (any stage can terminate here)
```

Every stage transition is written by either an agent (with an `AiDecision`
row) or a human action (logged in `Log`). The dashboard's Kanban view is a
direct projection of `stage` per `type`.

## 4. The AI Decision envelope (non-negotiable contract)

Every AI-authored output — anywhere in the system — is persisted as an
`AiDecision`:

```ts
type AiDecision = {
  agentKey: string;            // "jobs.discover", "email.triage", ...
  confidence: number;          // 0..1
  reasoning: string;           // human-readable "why"
  sources: string[];           // URLs / doc references used
  recommendedNextAction: string;
  draftContent?: string;       // the generated asset, if any
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  opportunityId?: string;
  emailId?: string;
};
```

`packages/core` exports `recordDecision()` which validates this shape (zod)
and writes it atomically alongside whatever state transition it justifies.
No agent writes to `Opportunity.stage`, `Task`, `Message`, or `Content`
without going through this helper — enforced by code review / lint rule
(agents package has no direct Prisma write access to those tables outside
the helper).

## 5. API surface (tRPC routers, `apps/api`)

`apps/api`/tRPC exists to give `apps/worker` (and any future consumer, e.g.
a mobile client) the same typed, validated domain operations `apps/web`
uses — it's warranted once a second consumer needs these operations, which
starts at M4 when the worker calls into domain services. Until then,
`apps/web`'s own mutations are Next.js Server Actions colocated per
feature (e.g. `app/(app)/knowledge-hub/actions.ts`), each doing the same
auth check → role check → validate → write → audit-log sequence a tRPC
procedure would. Building the tRPC layer before a second consumer exists
would be speculative; the router list below is the target shape once it's
warranted, not aspirational-only — the underlying service functions it
wraps already exist.

- `auth` — session, role checks.
- `opportunities` — list/filter/get/updateStage, per type.
- `tasks` — VA queue: list (prioritized), claim, updateStatus, complete.
- `aiDecisions` — read-only, for the "Recent AI Decisions" feed.
- `contacts`, `companies` — CRUD.
- `investors`, `grants`, `jobs`, `leads` — type-specific read/detail
  endpoints layered on `opportunities`.
- `emails` — digest, categorize, draftReply (requires approval to send).
- `content` — draft, schedule, approve, publish (requires approval unless
  workspace setting `autoPublish=true`).
- `meetings` — CRUD, calendar sync.
- `documents` — knowledge base CRUD with versioning.
- `settings` — workspace config.
- `notifications` — list/markRead.

Every mutating procedure requires an authenticated session and passes
through a role-check + workspace-scope middleware before touching Prisma.

## 6. Frontend structure (`apps/web`)

Status noted per route — `live` shipped in M2, `stub` renders a real page
with real nav but no feature yet (so nothing 404s), unmarked is planned.

- `/login` — credentials sign-in. **live**
- `/dashboard` — the CEO dashboard: KPI row, today's queue, activity feed,
  recent AI decisions, sales pipeline, grant deadlines — queried live from
  Postgres. **live**
- `/knowledge-hub` — Documents tab (versioned bio/CV/pitch/etc, RBAC-gated
  editing), Job targeting tab, Investor targeting tab. **live**
- `/queue` — VA's prioritized task queue (table + kanban toggle). **stub**,
  lands in M3 (today's top items already surface on `/dashboard`)
- `/opportunities/[type]` — kanban board per opportunity type. **stub**,
  lands in M3
- `/opportunities/[type]/[id]` — detail view: full AiDecision history,
  drafts, approve/reject actions. lands in M3
- `/inbox` — email digest and triage. **stub**, lands in M7
- `/content` — marketing content calendar. **stub**, lands in M8
- `/settings` — workspace, integrations, approval policies. **stub**,
  lands incrementally as M3+ milestones need workspace-level config.

## 7. Environment variables (`.env.example` is authoritative)

`DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
`ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (Gmail +
Calendar), plus per-integration keys added as each integration ships.
Validated at process boot via `packages/core/src/env.ts` (zod) — the app
fails fast on missing/invalid config rather than at first use.

## 8. Testing strategy

- **Unit**: pure functions, zod schemas, the `AiDecision` envelope
  validator, lifecycle transition guards.
- **Integration**: tRPC routers against a test Postgres (dockerized),
  Prisma migrations applied per test run.
- **Agent tests**: agents tested with a mocked Claude client and mocked
  integration adapters — assert on the `AiDecision` shape and the state
  transition, not on live model output.
- **E2E**: Playwright over the critical founder/VA flows (approve a queued
  task, move a kanban card, view the dashboard) once the UI milestone lands.
- CI runs lint + typecheck + unit/integration tests on every PR;
  merge is blocked on red CI.
