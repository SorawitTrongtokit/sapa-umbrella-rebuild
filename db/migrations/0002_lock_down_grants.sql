-- Neon Data API sets ALTER DEFAULT PRIVILEGES granting authenticated full
-- table DML in schema public (grant-all + RLS model, like Supabase). This app
-- uses least-privilege grants instead: only the privileges in 0001, enforced
-- additionally by RLS. Lock the defaults down so future tables stay tight.

alter default privileges for role neondb_owner in schema public
  revoke all on tables from authenticated;

revoke insert, update, delete on public.profiles from authenticated;
revoke insert, update, delete on public.locations from authenticated;
revoke insert, update, delete on public.umbrellas from authenticated;
revoke insert, update, delete on public.borrow_transactions from authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;
revoke delete on public.feedback from authenticated;
