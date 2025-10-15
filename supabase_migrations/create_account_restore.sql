-- Restore (reactivate) account RPC and RLS hardening helpers

-- 1) RPC: reactivate current user's account
drop function if exists public.restore_account;

create function public.restore_account()
returns jsonb
security definer
set search_path = public
language sql
as $$
  update public.clients
     set status = 'active',
         delete_requested_at = null,
         deleted_at = null,
         anonymized = false
   where id = auth.uid()::text
  returning jsonb_build_object('success', true, 'status', status);
$$;

revoke all on function public.restore_account() from public;
grant execute on function public.restore_account() to authenticated;

-- 2) (Optional) tighten INSERT policy to prevent re‑registration while inactive exists
-- Adjust policy only if it exists; otherwise create a safe one.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='clients' and policyname='Authenticated users can create own profile'
  ) then
    execute 'drop policy "Authenticated users can create own profile" on public.clients';
  end if;

  execute $$
    create policy "Authenticated users can create own profile"
    on public.clients
    for insert
    to authenticated
    with check (
      id = auth.uid()::text
      and not exists (
        select 1 from public.clients c
        where c.email = clients.email
          and coalesce(c.status, 'active') <> 'active'
      )
    );
  $$;
end$$;

-- 3) Ensure strict self‑update/select remain in place (id = auth.uid()::text)
drop policy if exists client_self_update_delete_request on public.clients;
create policy client_self_update_delete_request
on public.clients
for update
to authenticated
using (id = auth.uid()::text)
with check (id = auth.uid()::text);

drop policy if exists "Users can view own profile" on public.clients;
create policy "Users can view own profile"
on public.clients
for select
to authenticated
using (id = auth.uid()::text);








