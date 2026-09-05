# AGENTS.md

PCSHPL umbrella borrowing system: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript, Tailwind 4, Neon (Managed Better Auth / Neon Postgres / Data API / RLS). `README.md` (Thai) has full feature, endpoint, and schema docs. Migration log from Supabase lives in `docs/migration-issues.md`.

## Commands

- **Use `npm.cmd` / `npx.cmd` in PowerShell — plain `npm` fails** (execution policy blocks `npm.ps1`).
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test` — run all three after changes.
- Single test file: `npx.cmd tsx --test tests/validation.test.ts`
- Tests are pure unit tests (Node test runner via `tsx --test`, files in `tests/*.test.ts`) — no DB or services needed.
- `next.config.ts` has `typedRoutes: true` — route strings are typechecked; generated route types live under `.next/` and are refreshed by `dev`/`build`.
- Neon schema migrations live in `db/migrations/*.sql` — apply with `npx.cmd tsx scripts/apply-neon-migration.ts` (tracks state in `app_private.neon_migrations`); needs the direct URL `NEON_DATABASE_URL_UNPOOLED`.

## Architecture

- No `src/` — path alias `@/*` maps to repo root. Pages/API in `app/`, client components in `components/`, logic in `lib/`.
- Auth: Neon Auth (Managed Better Auth) via `lib/auth-server.ts` (server: `createNeonAuth` + handler at `app/api/auth/[...path]`) and `lib/auth-client.ts` (browser). Sessions are cookie-based; no service-role key exists.
- Identity: `auth.getSession()` from `lib/auth.ts`; roles/status live in `public.profiles` (checked in `lib/auth.ts` guards).
- Direct Postgres via `getSql()` in `lib/db.ts` (`DATABASE_URL`, Neon **pooled**). Borrow/return API routes run transactions with `FOR UPDATE` row locks; don't replace them with plain updates. Scripts use `NEON_DATABASE_URL_UNPOOLED` (direct) for migrations/session state.
- Roles: `user` < `admin` < `owner` (mirrored into `neon_auth."user".role` as `user`/`admin`). Signup with `OWNER_EMAIL` auto-promotes to owner. Guards in `lib/auth.ts`.
- Every mutating API route writes `audit_logs` via `lib/audit.ts`; admin/owner actions require a reason field.
- Umbrella status pages poll `GET /api/umbrellas` every 10s (no realtime provider).
- Legacy-login: vault (`app_private.password_vault`) is the source of truth for original passwords; `lib/credential-password.ts` re-syncs the Better Auth scrypt hash when needed.

## Neon & migrations

- `neon.ts` declares `auth: true` + branch policy. After changing it, run `neon.cmd deploy` / `neon.cmd env pull`.
- **`neon env pull`/`checkout` rewrites `.env.local`** — never keep secrets only there; Vercel env is the deploy source of truth.
- Schema migrations: `npx.cmd tsx scripts/apply-neon-migration.ts` (add new SQL files to `db/migrations/`; idempotent, tracked).
- `app_private.password_vault`: AES-256-GCM vault in a private schema with deny-all RLS. Password reveal only through Owner APIs (reason + audit log required). Keys: `PASSWORD_VAULT_KEY`, `LEGACY_PASSWORD_KEY` — losing them makes vault data undecryptable.

## Environment

- Copy `.env.example` → `.env.local` (gitignored); `neon.cmd env pull` fills the Neon-managed vars. Required by hand: `APP_URL`, `OWNER_EMAIL`, `PASSWORD_VAULT_KEY`, `LEGACY_PASSWORD_KEY`, `NEON_AUTH_COOKIE_SECRET`.
- Server-only secrets, never expose to client: `DATABASE_URL`, `NEON_DATABASE_URL_UNPOOLED`, `PASSWORD_VAULT_KEY`, `LEGACY_PASSWORD_KEY`, `NEON_AUTH_COOKIE_SECRET`.
- Next.js loads `.env.local` automatically, but `scripts/` load it explicitly via `scripts/load-env.ts` (dotenv) — keep those imports when editing scripts.

## Data & one-off scripts

- Firebase RTDB exports go in `data/*.json` (gitignored); `data/umbrella-pcshspl/` is excluded from tsconfig and eslint.
- `npm.cmd run inspect:firebase -- <file>` (read-only), then `npm.cmd run migrate:users -- <file>` (dry-run; add `--write` for real migration).
- Supabase dump/backup files (`*.backup.gz`, `*.storage.zip`) contain PII — gitignored, never commit.

## Misc

- UI strings are Thai (school app) — keep new user-facing text in Thai.
- `supabase/migrations/` is kept for history only — the live schema is in `db/migrations/` on Neon.
- `.agent/`, `.codex/`, `.codegraph/` are local AI tool state — gitignored, never commit them.

---

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
