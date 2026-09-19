-- Minimal, auditable moderation access. Administrator membership cannot be
-- granted through the public API; add rows manually in the Supabase SQL editor.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_users enable row level security;

create policy admin_users_self_read
  on public.admin_users for select to authenticated
  using (user_id = auth.uid());

alter table public.reports
  add column if not exists status text not null default 'open'
    check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

create policy reports_admin_read
  on public.reports for select to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy reports_admin_update
  on public.reports for update to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Grant the first administrator explicitly after replacing the UUID:
-- insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000000000');
