# FounderOS — Milestone Roadmap

Rule: never move to the next milestone until the current one is stable
(builds, typechecks, tests pass in CI). Each milestone's PR description
records what shipped, files touched, architecture decisions, remaining
work, risks, and the recommended next milestone.

## M0 — Architecture & Specification (this PR)
- `docs/ARCHITECTURE.md`, `docs/TECHNICAL_SPEC.md`, `docs/MILESTONES.md`.
- Decide stack, repo layout, domain model, agent framework, security model.
- Exit criteria: docs reviewed/approved by founder before code is built
  against them.

## M1 — Foundation & Data Model
- Turborepo + pnpm monorepo skeleton (`apps/web`, `packages/db`,
  `packages/core`, `packages/config`).
- Full Prisma schema for the core entities in TECHNICAL_SPEC.md §2 and a
  baseline migration.
- `packages/core`: shared enums/types, zod env validation, the
  `AiDecision` envelope + `recordDecision()` contract (implementation
  stubbed where it needs a live DB, fully typed).
- Docker Compose for local Postgres + Redis.
- GitHub Actions CI: install, lint, typecheck, `prisma validate`, build.
- Exit criteria: `pnpm install && pnpm build` green in CI on a clean
  checkout; schema migrates cleanly against a fresh database.

## M2 — Auth, RBAC, Dashboard & Knowledge Hub — **shipped**
- NextAuth (Auth.js) credentials auth, `FOUNDER`/`VA`/`ADMIN` roles, JWT
  session carrying `role` + `workspaceId`, route middleware protecting all
  authenticated pages.
- `lib/rbac.ts`: role checks enforced at the Server Action layer (not just
  hidden in the UI) — editing the knowledge base requires `FOUNDER`/`ADMIN`.
- Dashboard (`apps/web`) with the full widget layout from the product
  brief — KPI row, VA queue, activity feed, recent AI decisions, sales
  pipeline, grant deadlines — queried directly from Postgres via
  workspace-scoped Prisma calls in Server Components. No mock data
  hardcoded in components.
- **Knowledge Hub** (pulled forward from M5 at the founder's request):
  versioned `Document` CRUD (bio, CVs, elevator pitch, exec summary, ...)
  where every save creates a new version rather than overwriting, plus
  editable **Job Search Profile** and **Investor Targeting Profile** forms
  — the structured criteria the Jobs/Investor agents will filter and score
  against once M4/M5 land.
- Premium UI system: Apple/Notion-inspired design tokens (validated via the
  dataviz skill's palette + contrast checks), shadcn-style primitives,
  sidebar + topbar app shell, stub pages for not-yet-built nav destinations
  so navigation never 404s.
- Seed script: one workspace, one founder user, one VA user, sample
  documents/profiles/opportunities/tasks/AI decisions so the UI is real
  data, not an empty shell, from the first login.
- **Deviation from TECHNICAL_SPEC.md §5**: mutations in `apps/web` use
  Next.js Server Actions colocated with each feature (e.g.
  `knowledge-hub/actions.ts`), not tRPC. tRPC remains the plan for M4+
  once `apps/worker` needs to call the same domain logic as `apps/web` —
  building the tRPC layer before a second consumer exists would be
  speculative. Server Actions call the same validated, audit-logged
  service functions tRPC procedures will wrap later, so this isn't a
  rewrite, just a deferred formalization.
- Exit criteria met: can log in as founder or VA, see role-appropriate
  edit permissions, dashboard loads real data from Postgres, knowledge
  base and targeting profiles are editable and persisted.

## M3 — Opportunity Lifecycle & Kanban
- `opportunities` tRPC router (CRUD + stage transitions).
- Kanban board UI per opportunity type, generic table/queue view.
- `Task` queue for the VA (`/queue`) with priority sort.
- Lifecycle transition guards (valid stage transitions only) + audit log
  entries on every transition.
- Exit criteria: can manually create an opportunity, move it through every
  lifecycle stage, see it logged, see it surface in the VA queue.

## M4 — AI Agent Framework + Jobs & Investor Agents — **partially shipped**
- `packages/agents`: a real, working slice landed early (at the founder's
  request, alongside real CV/company data) — `claude-client.ts` (Anthropic
  SDK, `claude-opus-4-8`, adaptive thinking, server-side `web_search` tool,
  `pause_turn` continuation handling), `jobs-agent.ts` and
  `investor-agent.ts` (research → qualify → draft in one Claude call,
  parsed against a zod schema, written to `Opportunity` + `JobDetail` /
  `InvestorDetail` + `AiDecision` via `recordDecision()` + `Task` for
  high-confidence matches). Triggered from a founder-only "Run now" button
  on `/opportunities` (Server Action), not yet a scheduled BullMQ job.
- **Not yet shipped**: the generic `Agent`/`AgentContext` interface
  described in `ARCHITECTURE.md` §6, `apps/worker` (BullMQ), and scheduled
  runs — today's trigger is a manual button, not autonomous discovery. The
  two agents also don't share a formal `Agent` interface yet; that
  abstraction is worth adding once a third agent (Grants) exists, not
  before.
- Every agent output writes an `AiDecision`; nothing skips the envelope.
  Verified: the UI shows the honest failure mode (no `ANTHROPIC_API_KEY`
  configured) rather than fabricating a result.
- Remaining for M4 proper: BullMQ worker + scheduled runs, the shared
  `Agent` interface, agent tests with a mocked Claude client (current
  tests cover the JSON-extraction/validation path only, not a live or
  mocked model call).

## M5 — Investor & Grants Agents
- Investor Agent shipped early as part of M4's pulled-forward slice
  (see above). Grants Agent remains.
- Knowledge base and targeting profiles (`Document`, `JobSearchProfile`,
  `InvestorSearchProfile` — shipped in M2) wired in as the source agents
  read from when scoring and drafting.
- Exit criteria: both agents pass the same test bar as M4; knowledge base
  versioning enforced (only one current version per kind/slug).

## M6 — Sales Agent + CRM surface
- `Lead`, `Company`, `Contact` CRUD + pipeline view per business
  (ViralX, Event Intelligence).
- Sales Agent: lead discovery, decision-maker research, outreach drafting.
- Exit criteria: pipeline visible per business, agent-drafted outreach
  flows into the approval queue like other agents.

## M7 — Email Agent (Gmail integration)
- Gmail OAuth adapter, categorization, digest, draft-reply generation.
- Hard rule enforced in code: no send without `approvedById` set.
- Exit criteria: inbox digest renders real categorized mail; approval gate
  demonstrably blocks unapproved sends (tested).

## M8 — Marketing Agent + Content Calendar
- Content drafting (LinkedIn/Instagram) against brand SOPs in the
  knowledge base, scheduling UI, publish-approval gate (with an explicit,
  auditable `autoPublish` workspace setting for later).
- Exit criteria: content moves DRAFT → PENDING_APPROVAL → APPROVED →
  SCHEDULED → PUBLISHED with logs at each step.

## M9 — Research Agent + Notifications/Digest polish
- Conference/podcast/award/ecosystem monitoring, actionable-only
  summarization.
- Daily digest notification pulling across all agents.
- Exit criteria: research agent output is filtered to "actionable" per its
  qualification rule (tested), digest assembles across all opportunity
  types.

## M10 — Analytics & Hardening
- KPI rollups, conversion-rate-by-stage analytics, activity feed
  performance pass.
- Security hardening pass: rate limiting on all outbound integrations,
  audit log coverage review, secrets rotation runbook.
- Load/perf pass sized for "thousands of future users" even though V1 has
  two.
- Exit criteria: analytics views load from aggregated queries (not
  N+1'd), security checklist in ARCHITECTURE.md §8 fully verified against
  the actual codebase.

---

Each milestone after M1 depends on the previous one's schema/API being
stable; if a later milestone needs a breaking schema change, it ships a
migration + updates TECHNICAL_SPEC.md in the same PR, never a silent drift.
