-- Create a table for public profiles if needed (optional, but good for user metadata)
create table public.profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  role text default 'GUARD' check (role in ('GUARD', 'ADMIN'))
);

-- Create a table for logs (the main event data)
create table public.logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users default auth.uid(),
  type text not null check (type in ('VISITOR', 'VEHICLE', 'ROUND', 'INCIDENT', 'MINUTA')),
  title text not null,
  subtitle text,
  description text,
  status text default 'ABIERTO' check (status in ('ABIERTO', 'CERRADO', 'EN_PROGRESO')),
  details jsonb, -- Stores flexible data like plate, visitor name, priority, etc.
  media_urls text[] -- Array of URLs for images/signatures
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.logs enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Logs policies
create policy "Logs are viewable by everyone (for now, or restrict to auth users)." on public.logs
  for select using (auth.role() = 'authenticated');

create policy "Guards can insert logs." on public.logs
  for insert with check (auth.role() = 'authenticated');

create policy "Guards can update logs." on public.logs
  for update using (auth.role() = 'authenticated');
