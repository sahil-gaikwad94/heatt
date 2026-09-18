-- Make PostgREST profile embedding explicit for feed responses.
-- The base tables remain owned by Supabase Auth; profiles is the public identity row.

alter table public.posts drop constraint if exists posts_author_id_fkey;
alter table public.posts add constraint posts_author_id_fkey foreign key (author_id) references public.profiles(id) on delete cascade;

alter table public.replies drop constraint if exists replies_author_id_fkey;
alter table public.replies add constraint replies_author_id_fkey foreign key (author_id) references public.profiles(id) on delete cascade;

alter table public.post_revisions drop constraint if exists post_revisions_editor_id_fkey;
alter table public.post_revisions add constraint post_revisions_editor_id_fkey foreign key (editor_id) references public.profiles(id) on delete restrict;

-- Keep the API user's write identity authoritative while allowing PostgREST to
-- expose only the public profile columns selected by the endpoint.
