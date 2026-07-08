-- The original profiles_admin policy sub-queried level.profiles from inside a
-- policy on level.profiles, which Postgres rejects with "infinite recursion
-- detected in policy for relation profiles". Route the role lookup through the
-- SECURITY DEFINER helper instead, which bypasses RLS.
drop policy if exists profiles_admin on level.profiles;
create policy profiles_admin on level.profiles for select to authenticated
  using (level."current_role"() = 'admin'::level.user_role);
