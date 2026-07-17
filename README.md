# ProfilePays

**Turn your profile into profit.**

ProfilePays is a social-advertising platform that pays users for temporarily swapping their profile pictures with brand-sponsored images, while giving businesses self-service tooling to launch targeted campaigns.

This is an npm-workspace monorepo containing a working NestJS API and a React frontend. It is **pre-release software**: auth and the campaign marketplace API are implemented and tested; payments and parts of the frontend/backend contract are still being reconciled (see [Status](#status)).

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18, Redux Toolkit, Material-UI 5, Axios, React Router 6, Vite 8, Vitest 4 |
| Backend   | NestJS 11 (TypeScript 5.9), TypeORM 0.3, PostgreSQL 16 |
| Auth      | JWT access tokens (15 min) + rotating refresh tokens (httpOnly cookie), bcrypt, role guards |
| CI/CD     | GitHub Actions (build, test, lint, Docker) on Node 20/22 |
| Container | Docker multi-stage images + docker-compose (Postgres, Redis, API, nginx SPA) |

## Prerequisites

- Node.js >= 20, npm >= 10
- PostgreSQL 16 (local dev) — or Docker for the compose stack
- A generated `JWT_SECRET` (the backend refuses to boot without one)

## Getting Started

```bash
git clone https://github.com/rblake2320/profilepays.git
cd profilepays
npm ci                        # installs all workspaces from the root lockfile

# Backend configuration
cp backend/.env.example backend/.env
#   edit backend/.env: set DB_* for your Postgres and a real JWT_SECRET:
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

npm run dev                   # backend on :3000 and frontend on :5173 concurrently
# or individually:
npm run dev:backend           # NestJS watch mode on http://localhost:3000
npm run dev:frontend          # Vite dev server on http://localhost:5173
```

The API is served under `http://localhost:3000/api/v1`. Swagger docs are at `http://localhost:3000/api/docs` in non-production environments.

## Build & Test

```bash
npm run build                 # build frontend then backend
npm test                      # frontend (vitest) + backend (jest) suites
npm run lint                  # eslint both packages
npm run type-check            # tsc --noEmit both packages
```

## Environment Variables

Read by the backend (`backend/.env`, see `backend/.env.example`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | API listen port |
| `NODE_ENV` | `development` | `development` enables TypeORM synchronize + Swagger |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allow-origin |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | PostgreSQL host/port |
| `DB_USERNAME` / `DB_PASSWORD` | `postgres` / — | PostgreSQL credentials |
| `DB_NAME` | `profilepays` | Database name |
| `DB_SSL` | `false` | Set `true` to enable TLS to Postgres (`DB_SSL_REJECT_UNAUTHORIZED=false` to allow self-signed) |
| `JWT_SECRET` | — (required) | Access-token signing secret |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | — | Used by the payments module (not yet wired) |

Frontend build-time variable: `VITE_API_URL` (defaults to `http://localhost:3000/api/v1` in dev; the Docker image defaults to the same-origin `/api/v1` nginx proxy).

## Docker Deployment

```bash
cp .env.example .env          # set DB/REDIS/JWT/Stripe values
docker compose up --build     # Postgres + Redis + API (:3000) + frontend (:80)
```

Both images are multi-stage builds from the repository root (the workspace lockfile lives there):

```bash
docker build -f backend/Dockerfile .
docker build -f frontend/Dockerfile --build-arg VITE_API_URL=/api/v1 .
```

## Status

Working and covered by tests:
- Signup / login / refresh-token rotation / logout, email-verification flow (token generation; email sending is stubbed)
- Campaign CRUD, filtered public marketplace listing, transactional campaign join with race-safe participant caps, earnings aggregation
- Role-based authorization (member / advertiser / admin)

Known gaps (tracked in CHANGELOG "Known gaps"):
- `PaymentsModule` (Stripe intents/subscriptions/payouts) exists but is not wired into the app pending a User-entity/schema reconciliation
- Some frontend API calls target endpoints from an earlier backend iteration and fall back to mock data; contract reconciliation is in progress
- Email delivery is not implemented (verification tokens are generated and logged)

## Contributing

1. Fork / branch from `main`
2. `npm run lint && npm test && npm run build` must pass
3. Open a pull request — the PR template will guide you. Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License

MIT – see [`LICENSE`](LICENSE).
