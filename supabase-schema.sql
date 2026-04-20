-- ============================================================
-- NCMS Clinical Portal - Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- Roles enum
create type user_role as enum ('admin', 'receptionist', 'doctor');
create type session_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type token_status as enum ('waiting', 'calling', 'in_session', 'completed', 'no_show');
create type gender_type as enum ('male', 'female', 'other', 'prefer_not_to_say');
create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'referred');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null,
  email text not null,
  phone text,
  specialization text,
  is_active boolean default true,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- SERVICES
-- ============================================================
create table services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  duration_minutes int not null default 30,
  fee numeric(10,2) not null default 0,
  department text,
  is_active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- PATIENTS
-- ============================================================
create table patients (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  id_card_number text unique not null,
  date_of_birth date,
  gender gender_type,
  phone text,
  email text,
  address text,
  emergency_contact text,
  emergency_phone text,
  primary_language text default 'English',
  medical_history text,
  allergies text,
  blood_group text,
  registered_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- DOCTOR SCHEDULES (weekly slots)
-- ============================================================
create table doctor_schedules (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid not null references profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_duration_minutes int default 30,
  max_patients int default 20,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(doctor_id, day_of_week, start_time)
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id),
  doctor_id uuid not null references profiles(id),
  service_id uuid references services(id),
  scheduled_at timestamptz not null,
  status appointment_status default 'pending',
  chief_complaint text,
  notes text,
  referred_from uuid references appointments(id),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TOKENS (queue management)
-- ============================================================
create table tokens (
  id uuid primary key default uuid_generate_v4(),
  token_number text not null,
  appointment_id uuid references appointments(id),
  patient_id uuid not null references patients(id),
  doctor_id uuid references profiles(id),
  service_id uuid references services(id),
  status token_status default 'waiting',
  category text default 'General',
  issued_at timestamptz default now(),
  called_at timestamptz,
  session_start timestamptz,
  session_end timestamptz,
  wait_minutes int,
  date date default current_date,
  created_by uuid references profiles(id)
);

-- ============================================================
-- RECEIPTS
-- ============================================================
create table receipts (
  id uuid primary key default uuid_generate_v4(),
  receipt_number text unique not null,
  appointment_id uuid references appointments(id),
  token_id uuid references tokens(id),
  patient_id uuid not null references patients(id),
  doctor_id uuid references profiles(id),
  service_id uuid references services(id),
  amount numeric(10,2) not null default 0,
  discount numeric(10,2) default 0,
  total_amount numeric(10,2) not null default 0,
  payment_method text default 'cash',
  payment_status text default 'paid',
  notes text,
  issued_by uuid references profiles(id),
  issued_at timestamptz default now()
);

-- ============================================================
-- SESSIONS (doctor-patient clinical sessions)
-- ============================================================
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid references appointments(id),
  token_id uuid references tokens(id),
  patient_id uuid not null references patients(id),
  doctor_id uuid not null references profiles(id),
  status session_status default 'scheduled',
  chief_complaint text,
  history_of_illness text,
  examination_findings text,
  diagnosis text,
  treatment_plan text,
  prescription text,
  follow_up_date date,
  referral_doctor_id uuid references profiles(id),
  referral_notes text,
  vital_signs jsonb,
  attachments jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- REFERRALS
-- ============================================================
create table referrals (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id),
  from_doctor_id uuid not null references profiles(id),
  to_doctor_id uuid not null references profiles(id),
  patient_id uuid not null references patients(id),
  reason text,
  priority text default 'routine',
  status text default 'pending',
  created_at timestamptz default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  title text not null,
  message text not null,
  type text default 'info',
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger patients_updated_at before update on patients
  for each row execute function update_updated_at();

create trigger appointments_updated_at before update on appointments
  for each row execute function update_updated_at();

create trigger sessions_updated_at before update on sessions
  for each row execute function update_updated_at();

create or replace function generate_receipt_number()
returns text as $$
declare
  yr text;
  seq int;
begin
  yr := to_char(now(), 'YYYY');
  select coalesce(max(cast(split_part(receipt_number, '-', 3) as int)), 0) + 1
  into seq
  from receipts
  where receipt_number like 'RX-' || yr || '-%';
  return 'RX-' || yr || '-' || lpad(seq::text, 5, '0');
end;
$$ language plpgsql;

create or replace function generate_token_number(dept text default 'A')
returns text as $$
declare
  seq int;
begin
  select coalesce(max(cast(split_part(token_number, '-', 2) as int)), 0) + 1
  into seq
  from tokens
  where date = current_date
    and token_number like dept || '-%';
  return dept || '-' || lpad(seq::text, 3, '0');
end;
$$ language plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table tokens enable row level security;
alter table sessions enable row level security;
alter table receipts enable row level security;
alter table services enable row level security;
alter table doctor_schedules enable row level security;
alter table referrals enable row level security;
alter table notifications enable row level security;

create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Admins can manage all profiles" on profiles for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "Authenticated users can read patients" on patients for select using (auth.role() = 'authenticated');
create policy "Receptionist and admin can insert patients" on patients for insert with check (auth.role() = 'authenticated');
create policy "Receptionist and admin can update patients" on patients for update using (auth.role() = 'authenticated');

create policy "Authenticated read appointments" on appointments for select using (auth.role() = 'authenticated');
create policy "Authenticated write appointments" on appointments for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update appointments" on appointments for update using (auth.role() = 'authenticated');

create policy "Authenticated read tokens" on tokens for select using (auth.role() = 'authenticated');
create policy "Authenticated write tokens" on tokens for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update tokens" on tokens for update using (auth.role() = 'authenticated');

create policy "Authenticated read sessions" on sessions for select using (auth.role() = 'authenticated');
create policy "Authenticated write sessions" on sessions for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update sessions" on sessions for update using (auth.role() = 'authenticated');

create policy "Authenticated read receipts" on receipts for select using (auth.role() = 'authenticated');
create policy "Authenticated write receipts" on receipts for insert with check (auth.role() = 'authenticated');

create policy "Authenticated read services" on services for select using (auth.role() = 'authenticated');
create policy "Admin manage services" on services for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "Authenticated read schedules" on doctor_schedules for select using (auth.role() = 'authenticated');
create policy "Admin manage schedules" on doctor_schedules for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "Authenticated read referrals" on referrals for select using (auth.role() = 'authenticated');
create policy "Authenticated write referrals" on referrals for insert with check (auth.role() = 'authenticated');

create policy "Own notifications" on notifications for all using (user_id = auth.uid());

-- ============================================================
-- SEED: Default Admin User
-- After running this schema, create a user via Supabase Auth
-- then run: insert into profiles (id, full_name, role, email)
-- values ('<user-uuid>', 'Admin User', 'admin', 'admin@ncms.com');
-- ============================================================
