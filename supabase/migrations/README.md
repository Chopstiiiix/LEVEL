# Supabase migrations

These files reconstruct LEVEL's database from scratch: the isolated `level` schema,
the `public.lvl_*` read views, the role-gated write RPCs, the alert rules engine,
and the admin user-management RPCs. Apply in filename order.

Two things worth knowing:

- **The `level` schema is deliberately not exposed to PostgREST.** The browser reads
  through `public.lvl_*` views (`security_invoker=on`) and writes only through
  SECURITY DEFINER RPCs in `public`. Realtime subscribes to the `level.*` base tables
  directly, which bypasses PostgREST.
- **The hosted Supabase project (`amxkbtjibfgvykexvkus`) is shared.** Its
  `supabase_migrations.schema_migrations` table also contains migrations named
  `001`–`004` and `confirmo_*` that belong to unrelated apps. Only the timestamped
  files in this folder are LEVEL's.

`20260708034500_fix_profiles_rls_recursion.sql` corrects a recursive RLS policy
introduced in `20260708033315_level_auth_roles.sql`. The original is kept as-is so
the history matches what was actually applied.

The `admin-users` edge function (`supabase/functions/admin-users/`) is deployed
separately with `supabase functions deploy admin-users`.
