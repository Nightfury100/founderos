# FounderOS

FounderOS is the founder's AI Chief of Staff — a set of autonomous AI agents
that discover, research, qualify, and draft opportunities (jobs, investors,
grants, sales leads, content, inbox triage) and place fully-prepared work
into a prioritized queue for a human Virtual Assistant to execute. The
founder reviews, decides, and attends meetings; the AI does the thinking.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for system design,
[`docs/TECHNICAL_SPEC.md`](docs/TECHNICAL_SPEC.md) for the data model and API
surface, and [`docs/MILESTONES.md`](docs/MILESTONES.md) for the build
roadmap. The project is built one milestone at a time — check `MILESTONES.md`
for current status.

## Repo layout

```
apps/
  web/          Next.js dashboard, kanban, queue, approvals
  api/          tRPC routers, auth, domain services   (M2+)
  worker/       BullMQ agent workers                  (M4+)
packages/
  db/           Prisma schema, migrations
  core/         Shared types, env validation, AiDecision envelope
  agents/       AI agent implementations               (M4+)
  integrations/ Gmail, Calendar, Claude, etc. adapters  (M4+)
  ui/           Shared component library                (M2+)
  config/       Shared tsconfig/eslint presets
docs/           Architecture, spec, milestones
```

## Getting started (local dev)

Requirements: Node 20+, pnpm 9+, Docker (for Postgres + Redis).

```bash
cp .env.example .env        # fill in secrets
docker compose up -d        # Postgres + Redis
pnpm install
pnpm --filter @founderos/db exec prisma migrate dev
pnpm dev
```

## Scripts (root)

- `pnpm dev` — run all apps in dev mode (Turborepo)
- `pnpm build` — build all apps/packages
- `pnpm lint` — lint all packages
- `pnpm typecheck` — typecheck all packages
- `pnpm test` — run unit/integration tests

## Status

Milestone 1 (Foundation & Data Model) in progress. See
[`docs/MILESTONES.md`](docs/MILESTONES.md).
