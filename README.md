# KeepItBalance

[![CI](https://github.com/kaungmyattun21/keepitbalance/actions/workflows/ci.yml/badge.svg)](https://github.com/kaungmyattun21/keepitbalance/actions/workflows/ci.yml)

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
| `pnpm test` | Run all tests (shared package, frontend, backend) |
| `pnpm lint` | Lint (includes module-boundary rules) |
| `pnpm build` | Build both apps |
| `pnpm format` / `pnpm format:check` | Prettier |

## API request limits and reverse proxies

JSON API bodies and all authentication bodies are limited to 100 KiB, including streamed/chunked
requests. Larger bodies return `413`; compressed request bodies are unsupported and return `415`.

`TRUSTED_PROXIES` defaults to empty: client addresses come from the TCP connection, and client-supplied
forwarded IP/protocol headers are ignored. When deploying behind a proxy, set it to a comma-separated
list of that proxy's IP addresses or CIDRs. For a proxy on the same host, for example:

```dotenv
TRUSTED_PROXIES=127.0.0.1/32,::1/128
```

Configure the proxy to overwrite `X-Forwarded-Proto` and overwrite or safely append to
`X-Forwarded-For`. Restrict access to the API to the intended proxy network. Express resolves the
client from the socket through the trusted chain; Better Auth uses a server-written client-IP header
for sessions and rate limiting. Client-supplied copies of that internal header are overwritten.
Better Auth's production rate-limit counters remain per process; use shared storage before scaling
to multiple API instances. Configure a matching body limit at the proxy as well.

The workspace pins patched transitive versions of `body-parser`, `mysql2`, and Prisma's `deepmerge-ts`
through pnpm overrides. Revisit these overrides when upstream dependencies adopt the patched versions.

## Testing

```bash
pnpm test                              # everything
pnpm --filter frontend test:watch      # frontend, rerun on save
```

- **Frontend:** Vitest + Testing Library (jsdom); the API is mocked at `fetch`.
- **Backend:** Vitest + supertest against a real PostgreSQL database. Tests use `<your database>_test`
  (e.g. `keepitbalance_test`), which is created and migrated automatically on the first run; set
  `TEST_DATABASE_URL` to use a different one. The name must end in `_test`, so your dev data is never touched.
- **CI:** GitHub Actions runs format, lint, typecheck, tests and build on every push to `main` and every pull request.

## What I Learned

<!-- 3–5 bullets: challenges, trade-offs, what you'd do differently. Reviewers love this section. -->
