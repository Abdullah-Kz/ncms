-- Run this in Supabase SQL Editor to fix doctor schedule RLS error

-- Drop existing restrictive policy
drop policy if exists "Admin manage schedules" on doctor_schedules;
drop policy if exists "Authenticated read schedules" on doctor_schedules;

-- Doctors can manage their own schedules
create policy "Doctors manage own schedules" on doctor_schedules
  for all using (auth.uid() = doctor_id);

-- Admins can manage all schedules
create policy "Admins manage all schedules" on doctor_schedules
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- All authenticated users can read schedules (needed for receptionist to check availability)
create policy "Authenticated read schedules" on doctor_schedules
  for select using (auth.role() = 'authenticated');
