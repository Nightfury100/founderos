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

## M2 — Auth, RBAC & Dashboard Shell
- NextAuth (Auth.js) credentials auth, `FOUNDER`/`VA`/`ADMIN` roles.
- Workspace-scoped session + tRPC middleware enforcing role/workspace
  checks server-side.
- Dashboard shell (`apps/web`) with the widget layout from the product
  brief, wired to real (if mostly empty) data via tRPC — no mock data
  hardcoded in components.
- Seed script: one workspace, one founder user, one VA user.
- Exit criteria: can log in as founder or VA locally, see role-appropriate
  views, dashboard loads real data from Postgres.

## M3 — Opportunity Lifecycle & Kanban
- `opportunities` tRPC router (CRUD + stage transitions).
- Kanban board UI per opportunity type, generic table/queue view.
- `Task` queue for the VA (`/queue`) with priority sort.
- Lifecycle transition guards (valid stage transitions only) + audit log
  entries on every transition.
- Exit criteria: can manually create an opportunity, move it through every
  lifecycle stage, see it logged, see it surface in the VA queue.

## M4 — AI Agent Framework + First Agent (Jobs Agent)
- `Agent` interface, `AgentContext`, BullMQ worker app (`apps/worker`).
- Claude integration adapter (`packages/integrations/claude`).
- Jobs Agent: discover → research → qualify → recommend → draft
  (tailored cover letter, recruiter message, LinkedIn outreach) → queue.
- Every step writes an `AiDecision`; nothing skips the envelope.
- Exit criteria: end-to-end run against a small fixture/mocked source
  produces a queued Task with attached drafts and a full decision trail,
  covered by agent tests with a mocked Claude client.

## M5 — Investor & Grants Agents
- Same pattern as M4, applied to Investor Agent and Grants Agent.
- Knowledge base (`Document`, versioned) wired in as the source for bios,
  pitches, deck info that agents reference when drafting.
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
