-- Create a table for webhooks
create table public.webhooks (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  url text not null,
  is_active boolean default true,
  event_types text[] default '{"log.created"}'
);

-- Set up Row Level Security (RLS)
alter table public.webhooks enable row level security;

-- Policies: Only Admins can manage webhooks
create policy "Admins can manage webhooks." on public.webhooks
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'ADMIN'
    )
  );
