-- Delight layer: private time capsules, guided practice, and Ask the Room.
-- All content stays outside public discovery and recommendation queries.

create table if not exists public.answer_marks (
  post_id uuid not null references public.posts(id) on delete cascade,
  reply_id uuid not null unique references public.replies(id) on delete cascade,
  marked_helpful_by uuid not null references public.profiles(id) on delete cascade,
  marked_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, reply_id)
);

create table if not exists public.practice_journeys (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title text not null,
  description text not null check (char_length(description) <= 300),
  path text not null,
  day_count smallint not null check (day_count between 1 and 31),
  rights_status text not null check (rights_status in ('public-domain', 'permission-granted', 'original')),
  approved_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.journey_days (
  journey_id uuid not null references public.practice_journeys(id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 31),
  wisdom_entry_id uuid references public.wisdom_entries(id) on delete restrict,
  practice_text text not null check (char_length(practice_text) <= 500),
  primary key (journey_id, day_number)
);

create table if not exists public.journey_enrollments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  journey_id uuid not null references public.practice_journeys(id) on delete cascade,
  current_day smallint not null default 0 check (current_day >= 0),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  primary key (user_id, journey_id)
);

create table if not exists public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete restrict,
  content text not null check (char_length(content) between 1 and 1000),
  reveal_at timestamptz not null,
  opened_at timestamptz,
  visibility text not null default 'private' check (visibility in ('private', 'mutual')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint time_capsules_private_recipient check (visibility = 'private' or recipient_id is not null)
);

create index if not exists time_capsules_due_idx on public.time_capsules (author_id, reveal_at) where opened_at is null;
create index if not exists journey_days_journey_idx on public.journey_days (journey_id, day_number);

alter table public.answer_marks enable row level security;
alter table public.practice_journeys enable row level security;
alter table public.journey_days enable row level security;
alter table public.journey_enrollments enable row level security;
alter table public.time_capsules enable row level security;

create policy answer_marks_read on public.answer_marks for select to authenticated using (true);
create policy answer_marks_author_write on public.answer_marks for all to authenticated using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())) with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid() and p.id = post_id));
create policy journeys_approved_read on public.practice_journeys for select to authenticated using (approved_at is not null and deleted_at is null);
create policy journey_days_approved_read on public.journey_days for select to authenticated using (exists (select 1 from public.practice_journeys j where j.id = journey_id and j.approved_at is not null and j.deleted_at is null));
create policy journey_enrollment_self on public.journey_enrollments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy time_capsule_owner_read on public.time_capsules for select to authenticated using (author_id = auth.uid() or (visibility = 'mutual' and recipient_id = auth.uid() and reveal_at <= timezone('utc', now())));
create policy time_capsule_owner_write on public.time_capsules for insert to authenticated with check (author_id = auth.uid());
create policy time_capsule_owner_update on public.time_capsules for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy time_capsule_owner_delete on public.time_capsules for delete to authenticated using (author_id = auth.uid());
