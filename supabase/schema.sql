create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text, full_name text, role text default 'Field Officer',
  district text default 'Assam', phone text, avatar_url text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(), code text unique not null,
  name text, type text default 'Truck', status text default 'active',
  lat double precision, lng double precision, speed_kmh real default 0,
  heading real default 0, eta text, route_code text, driver_id uuid,
  updated_at timestamptz default now(), created_at timestamptz default now()
);
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(), code text unique, name text not null,
  phone text, license_no text, status text default 'available',
  vehicle_id uuid references public.vehicles(id) on delete set null, created_at timestamptz default now()
);
create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(), code text unique not null,
  cargo text, origin text, destination text, status text default 'pending',
  vehicle_code text, eta text, priority text default 'normal',
  lat double precision, lng double precision,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(), code text unique not null,
  title text not null, type text not null, severity text default 'medium',
  status text default 'Active', lat double precision not null, lng double precision not null,
  road_code text, road_name text, description text, reported_by text,
  assigned_officer text, image_url text, detected_time text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.field_reports (
  id uuid primary key default gen_random_uuid(), code text unique,
  officer_id text, officer_name text, title text, description text,
  hazard_type text, severity text default 'medium',
  lat double precision, lng double precision, image_url text,
  status text default 'submitted', created_at timestamptz default now()
);
create table if not exists public.officers (
  id uuid primary key default gen_random_uuid(), code text unique not null,
  name text not null, district text, status text default 'ACTIVE', sector text, phone text,
  lat double precision, lng double precision,
  user_id uuid references auth.users(id) on delete set null, created_at timestamptz default now()
);
create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(), code text unique not null, name text not null,
  origin text, destination text, risk_score integer default 20, status text default 'open',
  coords_json jsonb, length_km real, updated_at timestamptz default now()
);
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(), code text, title text not null, message text,
  severity text default 'info', status text default 'active', source text,
  lat double precision, lng double precision, created_at timestamptz default now()
);
create table if not exists public.weather_data (
  id uuid primary key default gen_random_uuid(), district text, condition text, temp_c real,
  rainfall_mm real, humidity real, wind_kmh real, risk_level text, observed_at timestamptz default now()
);
create table if not exists public.districts (
  id uuid primary key default gen_random_uuid(), code text unique, name text not null, state text,
  risk_score integer default 10, lat double precision, lng double precision, population integer,
  updated_at timestamptz default now()
);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, username, full_name, role) values (
  new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
  coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'role', 'Field Officer')
) on conflict (id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.deliveries enable row level security;
alter table public.incidents enable row level security;
alter table public.field_reports enable row level security;
alter table public.officers enable row level security;
alter table public.routes enable row level security;
alter table public.alerts enable row level security;
alter table public.weather_data enable row level security;
alter table public.districts enable row level security;
do $$ declare t text; begin foreach t in array array['profiles','vehicles','drivers','deliveries','incidents','field_reports','officers','routes','alerts','weather_data','districts'] loop
 execute format('drop policy if exists "%s_select" on public.%I', t, t);
 execute format('create policy "%s_select" on public.%I for select using (true)', t, t);
 execute format('drop policy if exists "%s_insert" on public.%I', t, t);
 execute format('create policy "%s_insert" on public.%I for insert with check (true)', t, t);
 execute format('drop policy if exists "%s_update" on public.%I', t, t);
 execute format('create policy "%s_update" on public.%I for update using (true)', t, t);
end loop; end $$;
insert into storage.buckets (id, name, public) values ('field-reports', 'field-reports', true) on conflict (id) do update set public = true;
drop policy if exists "field_reports_storage_select" on storage.objects;
create policy "field_reports_storage_select" on storage.objects for select using (bucket_id = 'field-reports');
drop policy if exists "field_reports_storage_insert" on storage.objects;
create policy "field_reports_storage_insert" on storage.objects for insert with check (bucket_id = 'field-reports');
