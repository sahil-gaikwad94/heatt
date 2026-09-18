-- Heatt foundation schema
-- Rollout: apply after Supabase Auth is enabled. This migration is additive and
-- keeps all public writes behind RLS; the API must forward the user's JWT.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  handle text not null unique check (handle ~ '^[a-zA-Z0-9_.]{3,24}$'),
  bio text not null default '' check (char_length(bio) <= 160),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, handle)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'New member'), 80),
    'member_' || replace(left(new.id::text, 12), '-', '')
  )
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  topics text[] not null default '{}',
  styles text[] not null default '{}',
  languages text[] not null default '{English}',
  session_intent text not null default 'Explore' check (session_intent in ('Reflect', 'Learn', 'Connect', 'Explore')),
  learned_tunes text[] not null default '{}',
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.mutes (
  muter_id uuid not null references auth.users(id) on delete cascade,
  muted_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 240),
  topic text not null,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.room_memberships (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'owner')),
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (room_id, user_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete restrict,
  post_type text not null default 'Thought' check (post_type in ('Thought', 'Question', 'Practice', 'Poem', 'Check-in')),
  topic text not null check (char_length(topic) between 1 and 80),
  text text not null check (char_length(text) between 1 and 2000),
  invitation text not null default 'Just sharing' check (invitation in ('Advice welcome', 'Just sharing', 'Questions welcome')),
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'room', 'private')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint posts_visibility_room_consistency check ((visibility = 'room') = (room_id is not null)),
  constraint posts_private_has_no_room check (visibility <> 'private' or room_id is null)
);

create table if not exists public.post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  editor_id uuid not null references auth.users(id),
  text text not null,
  edited_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_reply_id uuid references public.replies(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.fires (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  intensity smallint not null check (intensity between 1 and 3),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create table if not exists public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('wisdom', 'post', 'personal')),
  source_id uuid,
  quoted_span text not null default '' check (char_length(quoted_span) <= 1000),
  note text not null default '' check (char_length(note) <= 5000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wisdom_entries (
  id uuid primary key default gen_random_uuid(),
  path text not null check (path in ('Gita', 'Stoic', 'Poetry', 'Creator', 'Blend')),
  language text not null default 'English',
  title text not null,
  exact_text text not null,
  attribution text not null,
  source text not null,
  rights_status text not null check (rights_status in ('public-domain', 'permission-granted', 'original')),
  context text not null,
  interpretation text not null,
  practice text,
  approved_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.wisdom_deliveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  delivery_date date not null,
  wisdom_entry_id uuid not null references public.wisdom_entries(id),
  timezone text not null default 'UTC',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, delivery_date)
);

create table if not exists public.feed_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'save', 'fire', 'reply', 'hide', 'not_interested')),
  ranker_version text not null,
  source text,
  occurred_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '14 days'
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'unsafe', 'copyright', 'other')),
  details text check (char_length(details) <= 500),
  created_at timestamptz not null default timezone('utc', now()),
  unique (reporter_id, post_id)
);

create table if not exists public.idempotency_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (char_length(key) between 8 and 160),
  response_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, key)
);

create index if not exists posts_public_time_idx on public.posts (created_at desc, id) where visibility = 'public' and deleted_at is null;
create index if not exists posts_author_time_idx on public.posts (author_id, created_at desc) where deleted_at is null;
create index if not exists posts_room_time_idx on public.posts (room_id, created_at desc) where deleted_at is null;
create index if not exists replies_post_time_idx on public.replies (post_id, created_at asc) where deleted_at is null;
create index if not exists fires_post_time_idx on public.fires (post_id, created_at desc);
create index if not exists feed_events_user_time_idx on public.feed_events (user_id, occurred_at desc);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger preferences_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
create trigger posts_updated_at before update on public.posts for each row execute function public.set_updated_at();
create trigger fires_updated_at before update on public.fires for each row execute function public.set_updated_at();
create trigger journal_updated_at before update on public.journal_entries for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.blocks enable row level security;
alter table public.mutes enable row level security;
alter table public.follows enable row level security;
alter table public.rooms enable row level security;
alter table public.room_memberships enable row level security;
alter table public.posts enable row level security;
alter table public.post_revisions enable row level security;
alter table public.replies enable row level security;
alter table public.fires enable row level security;
alter table public.bookmarks enable row level security;
alter table public.journal_entries enable row level security;
alter table public.wisdom_entries enable row level security;
alter table public.wisdom_deliveries enable row level security;
alter table public.feed_events enable row level security;
alter table public.reports enable row level security;
alter table public.idempotency_keys enable row level security;

create policy profiles_public_read on public.profiles for select to authenticated using (true);
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id = auth.uid());

create policy preferences_self_all on public.user_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy blocks_self_all on public.blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy mutes_self_all on public.mutes for all to authenticated using (muter_id = auth.uid()) with check (muter_id = auth.uid());
create policy follows_read on public.follows for select to authenticated using (follower_id = auth.uid() or following_id = auth.uid());
create policy follows_self_write on public.follows for all to authenticated using (follower_id = auth.uid()) with check (follower_id = auth.uid());

create policy rooms_public_or_member_read on public.rooms for select to authenticated using (visibility = 'public' or exists (select 1 from public.room_memberships m where m.room_id = id and m.user_id = auth.uid()));
create policy rooms_authenticated_create on public.rooms for insert to authenticated with check (created_by = auth.uid());
create policy room_members_self_read on public.room_memberships for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.rooms r where r.id = room_id and r.created_by = auth.uid()));
create policy room_members_self_join on public.room_memberships for insert to authenticated with check (user_id = auth.uid());
create policy room_members_self_leave on public.room_memberships for delete to authenticated using (user_id = auth.uid());

create policy posts_eligible_read on public.posts for select to authenticated using (
  deleted_at is null and (
    visibility = 'public'
    or (visibility = 'followers' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = author_id))
    or (visibility = 'room' and exists (select 1 from public.room_memberships m where m.room_id = posts.room_id and m.user_id = auth.uid()))
    or author_id = auth.uid()
  )
  and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = author_id)
  and not exists (select 1 from public.blocks b where b.blocker_id = author_id and b.blocked_id = auth.uid())
);
create policy posts_self_create on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy posts_self_update on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy posts_self_delete on public.posts for delete to authenticated using (author_id = auth.uid());

create policy replies_eligible_read on public.replies for select to authenticated using (deleted_at is null and exists (select 1 from public.posts p where p.id = post_id));
create policy replies_authenticated_create on public.replies for insert to authenticated with check (author_id = auth.uid());
create policy replies_self_update on public.replies for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy replies_self_delete on public.replies for delete to authenticated using (author_id = auth.uid());

create policy fires_self_all on public.fires for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy fires_post_read on public.fires for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id));
create policy bookmarks_self_all on public.bookmarks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy journal_self_all on public.journal_entries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wisdom_approved_read on public.wisdom_entries for select to authenticated using (approved_at is not null and deleted_at is null);
create policy wisdom_delivery_self_all on public.wisdom_deliveries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy feed_events_self_write on public.feed_events for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reports_self_create on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy idempotency_self_all on public.idempotency_keys for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- This function is intentionally narrow: it provides an eligible, bounded feed
-- fallback, not privileged access to private content.
create or replace function public.get_public_feed(p_limit integer default 20, p_before timestamptz default null)
returns setof public.posts
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.posts p
  where p.visibility = 'public'
    and p.deleted_at is null
    and (p_before is null or p.created_at < p_before)
    and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.author_id)
    and not exists (select 1 from public.blocks b where b.blocker_id = p.author_id and b.blocked_id = auth.uid())
  order by p.created_at desc, p.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
revoke all on function public.get_public_feed(integer, timestamptz) from public;
grant execute on function public.get_public_feed(integer, timestamptz) to authenticated;
