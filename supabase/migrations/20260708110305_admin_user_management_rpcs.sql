-- List all users (admin only).
create or replace function public.admin_list_users()
returns table (id uuid, email text, full_name text, org text, role text, created_at timestamptz)
language plpgsql security definer set search_path to level, public as $$
begin
  if level.current_role() is distinct from 'admin' then
    raise exception 'not authorized: admin only';
  end if;
  return query
    select p.id, p.email, p.full_name, p.org, p.role::text, p.created_at
    from level.profiles p
    order by p.created_at asc;
end $$;
grant execute on function public.admin_list_users() to authenticated;

-- Change a user's role (admin only). Guards against demoting the last admin.
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql security definer set search_path to level, public as $$
declare admin_count int;
begin
  if level.current_role() is distinct from 'admin' then
    raise exception 'not authorized: admin only';
  end if;
  if p_role not in ('admin','ops','trader','finance','exec','regulator') then
    raise exception 'invalid role: %', p_role;
  end if;
  -- don't allow removing the final admin
  if p_role <> 'admin' then
    select count(*) into admin_count from level.profiles where role = 'admin';
    if admin_count <= 1 and exists (select 1 from level.profiles where id = p_user and role = 'admin') then
      raise exception 'cannot remove the last admin';
    end if;
  end if;
  update level.profiles set role = p_role::level.user_role where id = p_user;
end $$;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- Lightweight admin check for the edge function to call with the caller's JWT.
create or replace function public.is_level_admin()
returns boolean
language sql security definer set search_path to level, public as $$
  select level.current_role() = 'admin';
$$;
grant execute on function public.is_level_admin() to authenticated;
