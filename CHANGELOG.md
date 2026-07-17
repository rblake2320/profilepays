# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-07-17

Production-readiness pass. Every gate failed on entry: neither package
built, CI tested nothing, and a live credential was committed publicly.

### Security
- Removed a real database password committed in `backend/.env.example`,
  `backend/README.md`, and nine local debug/setup scripts (scripts deleted).
  **The password itself is burned — it remains in public git history and
  must be rotated wherever it is used.**
- Removed dead duplicate `auth/jwt.strategy.ts` carrying a hardcoded
  fallback JWT secret.
- Upgraded backend from NestJS 9 (EOL Express 4 stack with body-parser,
  multer, path-to-regexp, express, lodash advisories) to NestJS 11.
  `npm audit`: 62 vulnerabilities (3 critical / 24 high) → 4 moderate,
  all dev-only; production dependency tree audits clean.
- Backend now fails fast at boot when `JWT_SECRET` is missing.

### Fixed
- Backend did not compile (type error in a dead duplicate strategy left
  by the eaa2408 add/add merge); removed the dead parallel halves
  (duplicate strategy, second TypeORM root module, orphan register DTO).
- Every signup/login returned 500: the JWT payload set `exp` alongside
  the `expiresIn` sign option, which jsonwebtoken rejects.
- Every frontend API call 404'd: backend global prefix was `api` while
  the frontend/docs use `api/v1`; campaigns controller additionally
  doubled the prefix (`/api/v1/api/campaigns`). CORS default now matches
  the Vite dev port.
- Frontend did not build: unused `@mui/icons-material` at an
  impossible version; root manifest carried a parallel React 19/jest 30
  toolchain that hoisted a second React copy.
- `/auth/refresh` without a token returned 500 instead of 401.
- Campaign join is now transactional: participation insert + guarded
  participant-count increment commit together (no overshoot of
  maxParticipants under concurrency; duplicate joins map to 409).
- Scheduled-task queries dropped their broken always-truthy `IsNull()`
  ternaries that loaded entire tables row-by-row.
- Docker: compose referenced Dockerfiles that could not work (no
  lockfile in workspace subfolders, nonexistent `npm start`, wrong CMD
  path, healthcheck against a route that does not exist, `DB_DATABASE`
  env var the code never reads). Images rebuilt as root-context
  multi-stage builds and verified; frontend nginx proxies `/api/` and
  starts standalone.

### Changed
- CI now builds and tests both packages on Node 20/22 and builds both
  Docker images (previously all code jobs were `if: false`).
- Frontend tests migrated from a hand-rolled assert script (which tested
  inline copies of functions) to vitest 4 running the real test files;
  scripts are cross-platform (the `NODE_PATH=…` prefixes broke Windows).
- Backend tests: 1 → 22 (auth signup/login/refresh happy paths, edge
  cases, and a real-JwtService regression test for the exp bug;
  campaign join race/duplicate cases). Frontend: 6 real tests.
- Dependencies: axios 1.18, vite 8, typescript 5.9, helmet 8,
  typeorm 0.3.31, passport 0.7; root pins react 18 and @nestjs 11 to
  make npm-workspace peer hoisting deterministic.

### Known gaps (flagged, not addressed in this pass)
- `PaymentsModule` is not wired into `AppModule` (routes dead); it
  depends on a second `User` entity that conflicts with the primary one
  and needs a schema migration decision before wiring.
- Frontend API layer was written against a different backend iteration:
  `/auth/register`, `/campaigns/marketplace|stats|my`, `/payments/*` do
  not exist on this backend. Contract reconciliation pending.
- ESLint 8 (EOL) retained pending a flat-config migration; remaining
  4 moderate advisories are dev-only (webpack/@nestjs/cli chain).

## [0.2.0] (superseded history)

### Added
- Comprehensive project documentation and templates
- Contributing guidelines and security policy
- GitHub issue and pull request templates
- Development environment setup scripts
- Docker configuration for development and production
- Code quality tooling (Prettier, ESLint configuration)
- Automated CI/CD workflows for documentation validation
- Project architecture documentation
- Initial ProfilePays frontend built with Vite/React, including landing, advertiser, marketplace, confirmation, how-it-works, and about pages
- Custom front-end component library (layout shell, statistics cards, timers, info panels, marketplace cards) and supporting mock data
- Lightweight TypeScript-based frontend and backend smoke tests to validate utilities and sample data without third-party test runners

### Changed
- Updated README.md to accurately reflect repository contents
- Enhanced .gitignore with comprehensive patterns
- Improved GitHub Actions workflows for current repository state
- Relaxed ESLint configuration to support the new tooling constraints and updated lint/test scripts to work in offline environments

### Fixed
- Corrected documentation inconsistencies
- Fixed references to non-existent directories and files

## [0.1.0] - 2025-01-XX

### Added
- Initial repository setup
- MIT License
- Basic project structure and documentation

