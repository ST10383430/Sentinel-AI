-- Sentinel database schema
-- Run in the Supabase SQL editor if you want cloud persistence.

create table if not exists incidents (
  id text primary key,
  category text not null,
  description text not null,
  latitude double precision not null,
  longitude double precision not null,
  severity text not null default 'medium',
  status text not null default 'unverified',
  created_at timestamptz not null default now(),
  image_uri text,
  visibility text not null default 'public',
  image_visibility text not null default 'private'
);

-- Safe migration for projects created from older Sentinel schemas.
alter table incidents add column if not exists image_uri text;
alter table incidents add column if not exists visibility text not null default 'public';
alter table incidents add column if not exists image_visibility text not null default 'private';

create table if not exists emergency_alerts (
  id text primary key,
  latitude double precision not null,
  longitude double precision not null,
  status text not null default 'triggered',
  created_at timestamptz not null default now()
);

alter table incidents enable row level security;
alter table emergency_alerts enable row level security;

drop policy if exists "demo read incidents" on incidents;
drop policy if exists "demo insert incidents" on incidents;
drop policy if exists "demo insert emergency" on emergency_alerts;
drop policy if exists "starter read incidents" on incidents;
drop policy if exists "starter insert incidents" on incidents;
drop policy if exists "starter insert emergency" on emergency_alerts;

create policy "starter read incidents" on incidents for select to anon using (true);
create policy "starter insert incidents" on incidents for insert to anon with check (true);
create policy "starter insert emergency" on emergency_alerts for insert to anon with check (true);

do $$ begin
  alter publication supabase_realtime add table incidents;
exception when duplicate_object then null;
end $$;

-- NOTE: These are hackathon-friendly starter policies. For production, private reports
-- should be protected with authenticated user ownership policies rather than a public
-- anon select policy. The mobile app already suppresses private reports from public UI.
