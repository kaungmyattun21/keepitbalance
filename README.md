# KeepItBalance

> One sentence: what it does and who it's for.

<!-- Add a screenshot or demo GIF here once something works. -->

**Live demo:** _link_

## Features

- Feature 1
- Feature 2
- Feature 3

## Tech Stack

| Layer    | Choice | Why (one line) |
|----------|--------|----------------|
| Frontend | Vite, React 19, React Router, TanStack Query, Zustand, React Hook Form + Zod, shadcn/ui + Tailwind | Login-gated dashboard: an SPA is the simplest fit |
| Backend  | Express 5, TypeScript, Zod, Better Auth | Separate API with a clear routes → controller → service → repository split |
| Database | PostgreSQL + Prisma | Relational data and all-or-nothing transactions |
| Hosting  | _TBD_ | |

## Architecture

<!-- Add an architecture diagram here. -->

## Getting Started

Requires Node.js 24+, pnpm 9+ and Docker.

```bash
# clone
git clone <repo-url>
cd keepitbalance

# install (both apps; pnpm workspace)
pnpm install

# configure
cp .env.example .env                    # Docker: Postgres + pgAdmin logins (used when volumes are first created)
cp backend/.env.example backend/.env    # API: fill in DATABASE_URL and BETTER_AUTH_SECRET

# database
docker compose up -d                    # PostgreSQL on :5432, pgAdmin on :5050
pnpm --filter backend db:migrate        # apply migrations + generate the Prisma client

# run both apps
pnpm dev                                # web: http://localhost:5173 · API: http://localhost:3000/api/v1
```

In development the web app forwards `/api/*` to the API (Vite proxy), so open only <http://localhost:5173>.
Verification and password-reset emails are printed in the API's terminal.

| Command | What it does |
|---|---|
| `pnpm dev` | Start API and web app together |
| `pnpm typecheck` | Type-check both apps |
| `pnpm lint` | Lint (includes module-boundary rules) |
| `pnpm build` | Build both apps |
| `pnpm format` / `pnpm format:check` | Prettier |

## What I Learned

<!-- 3–5 bullets: challenges, trade-offs, what you'd do differently. Reviewers love this section. -->
