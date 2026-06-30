-- Cloud-saved degree plans + read-only share links.
-- A plan stores the full editor state as JSON; sharing flips is_public and a
-- random share_id makes it readable by anyone with the link.

create extension if not exists "pgcrypto";

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'My plan',
  program_id text not null,
  aoe_id text,
  state jsonb not null,
  share_id text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_user_id_idx on public.plans (user_id);
create index if not exists plans_share_id_idx on public.plans (share_id);

-- Keep updated_at fresh on every write.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

alter table public.plans enable row level security;

-- Owners can do anything with their own rows.
drop policy if exists "Owners manage their plans" on public.plans;
create policy "Owners manage their plans"
  on public.plans
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone (including anonymous) can read a plan that has been made public.
drop policy if exists "Public can read shared plans" on public.plans;
create policy "Public can read shared plans"
  on public.plans
  for select
  to anon, authenticated
  using (is_public = true);
