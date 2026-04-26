# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PCSHSPL Umbrella Borrowing System** — A real-time umbrella borrow/return system for a school, built with Next.js App Router + Supabase. Features Google OAuth, legacy Firebase password migration, encrypted password vault, and role-based access control (user / admin / owner).

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Run tests (tsx --test tests/**/*.test.ts)
npm run migrate:users  # Migrate users from Firebase export
```

## Architecture

### Auth Flow

Three authentication paths:
1. **Google OAuth** → `/auth/callback` → onboarding (if new) → `/dashboard`
2. **Email registration** → `POST /api/auth/register` → creates Supabase Auth user, encrypts password in vault
3. **Legacy login** → `POST /api/auth/legacy-login` → decrypts Firebase-era password, auto-migrates to Supabase format

Session handling uses `@supabase/ssr` with cookie-based sessions. Middleware at `middleware.ts` (proxying via `lib/proxy.ts`) refreshes tokens automatically.

### Supabase Client Pattern

Three distinct clients — never mix them up:
- `createSupabaseServerClient()` — server components/actions, uses cookies
- `createSupabaseBrowserClient()` — client components, uses only `NEXT_PUBLIC_*` keys
- `createSupabaseServiceClient()` — server-only admin operations, uses `SUPABASE_SERVICE_ROLE_KEY`

### Authorization

All API routes and server components guard access with:
- `requireActiveProfile()` — ensures user is authenticated and not suspended
- `requireRole(['admin', 'owner'])` — RBAC check (throws 403 if insufficient)

Database enforces the same rules via RLS policies and private SQL functions (`app_private.is_admin()`, `app_private.is_owner()`).

### Password Vault

`app_private.password_vault` stores AES-256-GCM encrypted passwords in a private Postgres schema with deny-all RLS. Only the service role can access it. Every read is audit logged. Key rotation is supported via `key_version`. See `lib/password-vault.ts`.

### Umbrella State Machine

Umbrellas transition: `available → borrowed → available` (or `disabled`). Borrow/return operations use `SELECT ... FOR UPDATE` row locks inside transactions to prevent races. A `version` column detects concurrent conflicts.

### Realtime

The `umbrellas` table has `REPLICA IDENTITY FULL` and is published to Supabase Realtime. `DashboardClient.tsx` subscribes to it for live UI updates without polling.

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client-side Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key |
| `DATABASE_URL` | Direct Postgres (scripts only) |
| `OWNER_EMAIL` | Email that gets `owner` role on register |
| `PASSWORD_VAULT_KEY` | AES-256 GCM key for password vault |
| `LEGACY_PASSWORD_KEY` | Decryption key for Firebase-era passwords |
| `APP_URL` | Base URL (e.g. `http://localhost:3000`) |

## Database

Migrations live in `supabase/migrations/`. Apply with the Supabase CLI (`supabase db push`).

Core tables: `profiles`, `umbrellas`, `borrow_transactions`, `locations`, `feedback`, `audit_logs`, `app_private.password_vault`.

The `profiles` table is auto-populated by a trigger on `auth.users` insert. Role defaults to `user` unless the email matches `OWNER_EMAIL`.

## Route Structure

| Path | Role | Purpose |
|---|---|---|
| `/dashboard` | user+ | Borrow/return umbrellas |
| `/admin` | admin+ | Enable/disable/manage umbrellas |
| `/owner` | owner | Users, passwords, audit logs, feedback |
| `/onboarding` | any | Post-OAuth setup (class, student number, password) |
| `/api/umbrellas/[id]/borrow` | user+ | Borrow action |
| `/api/umbrellas/[id]/return` | user+ | Return action |
| `/api/admin/umbrellas/[id]` | admin+ | Umbrella state management |
| `/api/owner/users/[id]` | owner | User PATCH + password reveal |
