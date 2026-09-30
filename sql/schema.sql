-- Sentinel hackathon schema
-- Run in the Supabase SQL editor if you want cloud persistence.

create table if not exists incidents (
  id text primary key,
  category text not null,
  description text not null,
  latitude double precision not null,
  longitude double precision not null,
  severity text not null default 'medium',
  status text not null default 'unverified',
  created_at timestamptz not null default now()
);

create table if not exists emergency_alerts (
  id text primary key,
  latitude double precision not null,
  longitude double precision not null,
  status text not null default 'test_triggered',
  created_at timestamptz not null default now()
);

-- IMPORTANT: For a real deployment, enable RLS and use authenticated policies.
-- The hackathon application intentionally uses local state as its guaranteed fallback.
