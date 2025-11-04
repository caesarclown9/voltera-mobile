-- Account deletion support (clients table fields, RPC, RLS)

-- 1) Columns on clients
alter table if exists public.clients
  add column if not exists delete_requested_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists anonymized boolean not null default false;

-- 2) RPC for in‑app account deletion request
create or replace function public.request_account_deletion()
returns jsonb
security definer
set search_path = public
language sql
as $$
  update public.clients
     set delete_requested_at = now(),
         status = 'inactive'
   where id = auth.uid()::text
  returning jsonb_build_object(
    'success', true,
    'delete_requested_at', delete_requested_at
  );
$$;

revoke all on function public.request_account_deletion() from public;
grant execute on function public.request_account_deletion() to authenticated;

-- 3) RLS: client can update only self
alter table public.clients enable row level security;

create policy if not exists client_self_update_delete_request
on public.clients
for update
to authenticated
using (id = auth.uid()::text)
with check (id = auth.uid()::text);

-- 4) Optional admin procedure for anonymization (service role)
create or replace procedure public.anonymize_client(p_client uuid)
language plpgsql
security definer
as $$
begin
  update public.clients
     set anonymized = true,
         deleted_at = now(),
         email = concat('deleted+', p_client, '@example.com'),
         phone = null,
         name = 'Deleted User'
   where id = p_client;
end;
$$;

revoke all on procedure public.anonymize_client(uuid) from public;
grant execute on procedure public.anonymize_client(uuid) to service_role;


