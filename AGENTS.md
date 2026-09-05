# AGENTS.md

PCSHPL umbrella borrowing system: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript, Tailwind 4, Supabase (Auth/Postgres/Realtime/RLS). `README.md` (Thai) has full feature, endpoint, and schema docs.

## Commands

- **Use `npm.cmd` / `npx.cmd` in PowerShell — plain `npm` fails** (execution policy blocks `npm.ps1`).
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test` — run all three after changes.
- Single test file: `npx.cmd tsx --test tests/validation.test.ts`
- Tests are pure unit tests (Node test runner via `tsx --test`, files in `tests/*.test.ts`) — no DB or services needed.
- `next.config.ts` has `typedRoutes: true` — route strings are typechecked; generated route types live under `.next/` and are refreshed by `dev`/`build`.

## Architecture

- No `src/` — path alias `@/*` maps to repo root. Pages/API in `app/`, client components in `components/`, logic in `lib/`.
- `proxy.ts` at repo root is the Next.js 16 middleware (renamed "proxy" in v16) — refreshes Supabase auth cookies on navigation. Not a stray file.
- Two DB access paths:
  - Supabase clients (`lib/supabase-server.ts`, `lib/supabase-browser.ts`) — auth and RLS-scoped queries.
  - Direct Postgres via `getSql()` in `lib/db.ts` (`DATABASE_URL`) — borrow/return API routes run transactions with `FOR UPDATE` row locks; don't replace them with plain Supabase updates.
- Roles: `user` < `admin` < `owner`. Signup with `OWNER_EMAIL` auto-promotes to owner. Guards in `lib/auth.ts`.
- Every mutating API route writes `audit_logs` via `lib/audit.ts`; admin/owner actions require a reason field.

## Supabase & migrations

- Apply ALL migrations in `supabase/migrations/` in filename order — README's setup section only lists the first two; the third (`202605050001_audit_fixes.sql`) adds the unique active-borrow index and `app_private.auth_attempts`.
- No `supabase/config.toml` or local Supabase stack — migrations are applied via Supabase SQL editor or CLI against the remote project.
- `app_private.password_vault`: AES-256-GCM vault in a private schema with deny-all RLS. Password reveal only through Owner APIs (reason + audit log required). Keys: `PASSWORD_VAULT_KEY`, `LEGACY_PASSWORD_KEY` — losing them makes vault data undecryptable.

## Environment

- Copy `.env.example` → `.env.local` (gitignored). Required: Supabase URL/anon key, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `OWNER_EMAIL`, vault/legacy keys.
- Server-only secrets, never expose to client: `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `PASSWORD_VAULT_KEY`, `LEGACY_PASSWORD_KEY`.
- Next.js loads `.env.local` automatically, but `scripts/` load it explicitly via `scripts/load-env.ts` (dotenv) — keep those imports when editing scripts.

## Data & one-off scripts

- Firebase RTDB exports go in `data/*.json` (gitignored); `data/umbrella-pcshspl/` is excluded from tsconfig and eslint.
- `npm.cmd run inspect:firebase -- <file>` (read-only), then `npm.cmd run migrate:users -- <file>` (dry-run; add `--write` for real migration).

## Misc

- UI strings are Thai (school app) — keep new user-facing text in Thai.
- Root `neon.ts`, `hello.ts`, `.neon` are Neon platform config (functions preview/branch policy) — kept intentionally: the plan is to migrate the database from Supabase Postgres to Neon. Not app code.
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
