-- The contact form table. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Row-Level Security is on. The website's public (anon) key may ADD a row and nothing else:
-- there is no select, update or delete policy, so nobody can read the messages with that key.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  message text not null check (char_length(message) between 1 and 5000)
);

alter table public.contact_messages enable row level security;

create policy "Anyone can send a message"
  on public.contact_messages for insert to anon with check (true);

grant usage on schema public to anon;
grant insert on table public.contact_messages to anon;
