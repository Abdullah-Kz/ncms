-- Run this in your Supabase SQL Editor

create table if not exists departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  is_active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table departments enable row level security;

create policy "Authenticated read departments" on departments
  for select using (auth.role() = 'authenticated');

create policy "Admin manage departments" on departments
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
