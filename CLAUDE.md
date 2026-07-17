# ProfilePays — Agent Notes

Rules distilled from the 2026-07-17 production-readiness pass. They prevent the
two classes of failure that put this repository in an unshippable state.

## 1. Never resolve merge conflicts by keeping both implementations

The `eaa2408` add/add merge kept two parallel backends (duplicate JWT
strategies, two `User` entities, two TypeORM root modules, `signup` vs
`register` DTOs). The result compiled for neither and shipped a hardcoded
fallback secret. When two branches implement the same feature, pick ONE graph
and delete the other in the same commit — then prove it: `npm run build` and
`npx jest` must pass in both `backend/` and `frontend/` before the merge lands.
CI enforces this now; do not re-disable jobs with `if: false`.

## 2. No real credentials anywhere in the tree — including "examples" and debug scripts

A live database password shipped in `backend/.env.example`, `backend/README.md`,
and nine committed debug scripts, publicly, for months. `.env.example` files
contain placeholders only (`CHANGE_ME_*`). One-off local helper scripts that
embed credentials never get committed. Before any commit that touches config or
docs: `git grep -iE 'password|secret|api[_-]?key' -- ':!*.example'` and read
what you find.

## Repository facts agents get wrong

- npm workspace: the ONLY `package-lock.json` is at the root. `npm ci` in a
  workspace subfolder fails; Docker builds use the repository root as context.
- npm auto-installs hoisted peers at an arbitrary satisfying version; react 18
  and @nestjs 11 are pinned in root devDependencies to keep resolution
  deterministic. Do not remove those pins without re-checking `npm explain`.
- The API global prefix is `api/v1`. Controllers declare bare paths
  (`campaigns`, not `api/campaigns`).
- `PaymentsModule` is intentionally NOT imported in `AppModule` — wiring it
  requires reconciling `database/entities/user.entity.ts` with
  `users/entities/user.entity.ts` (schema decision, needs human approval).
- The Windows-generated lockfile omits foreign-platform optional binaries
  (npm/cli#4828); `frontend/Dockerfile` installs rolldown's linux-musl binding
  explicitly. Keep that step when touching the Dockerfile.
