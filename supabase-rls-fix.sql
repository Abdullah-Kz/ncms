-- Run this in Supabase SQL Editor to fix admin dashboard showing 0s
-- It adds admin read policies to all tables

-- Profiles: admins can read all
drop policy if exists "Admins can manage all profiles" on profiles;
create policy "Admins can manage all profiles" on profiles
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Allow all authenticated users to read profiles (needed for doctor lists etc)
drop policy if exists "Authenticated read profiles" on profiles;
create policy "Authenticated read profiles" on profiles
  for select using (auth.role() = 'authenticated');

-- Sessions: admin can read all
drop policy if exists "Admin read all sessions" on sessions;
create policy "Admin read all sessions" on sessions
  for select using (auth.role() = 'authenticated');

-- Tokens: admin can read all  
drop policy if exists "Admin read all tokens" on tokens;
create policy "Admin read all tokens" on tokens
  for select using (auth.role() = 'authenticated');

-- Receipts: admin can read all
drop policy if exists "Admin read all receipts" on receipts;
create policy "Admin read all receipts" on receipts
  for select using (auth.role() = 'authenticated');

-- Appointments: admin can read all
drop policy if exists "Admin read all appointments" on appointments;
create policy "Admin read all appointments" on appointments
  for select using (auth.role() = 'authenticated');
