-- Botswana Web Performance Auditor — Supabase schema
--
-- Setup: paste this whole file into your Supabase project's
-- SQL Editor (https://supabase.com/dashboard → SQL Editor) and run it.
--
-- Security model:
--   * RLS is enabled on both tables and the anon role has NO direct access.
--   * All writes go through submit_run(jsonb), a SECURITY DEFINER function.
--   * The anon key can therefore only insert complete runs — never read,
--     update, or delete anything.

create table if not exists public.runs (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  cli_version        text,
  node_version       text,
  os                 text,
  lighthouse_version text,
  runs_per_site      integer,
  sites_audited      integer,
  duration_seconds   numeric
);

create table if not exists public.site_results (
  id                bigint generated always as identity primary key,
  run_id            uuid not null references public.runs (id) on delete cascade,
  created_at        timestamptz not null default now(),
  name              text not null,
  url               text not null,
  industry          text,
  score             numeric,
  lcp               numeric,
  cls               numeric,
  tbt               numeric,
  fcp               numeric,
  si                numeric,
  tti               numeric,
  total_size_kb     numeric,
  total_requests    integer,
  third_party_ratio numeric,
  raw               jsonb
);

create index if not exists site_results_run_id_idx   on public.site_results (run_id);
create index if not exists site_results_url_idx      on public.site_results (url);
create index if not exists site_results_created_idx  on public.site_results (created_at);
create index if not exists runs_created_at_idx       on public.runs (created_at);

alter table public.runs         enable row level security;
alter table public.site_results enable row level security;

revoke all on public.runs         from anon;
revoke all on public.runs         from authenticated;
revoke all on public.site_results from anon;
revoke all on public.site_results from authenticated;

create or replace function public.submit_run(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  r        jsonb;
begin
  insert into public.runs (
    cli_version, node_version, os, lighthouse_version, runs_per_site, sites_audited, duration_seconds
  ) values (
    nullif(payload->'meta'->>'cli_version', ''),
    nullif(payload->'meta'->>'node_version', ''),
    nullif(payload->'meta'->>'os', ''),
    nullif(payload->'meta'->>'lighthouse_version', ''),
    nullif(payload->'meta'->>'runs_per_site', '')::integer,
    nullif(payload->'meta'->>'sites_audited', '')::integer,
    nullif(payload->'meta'->>'duration_seconds', '')::numeric
  )
  returning id into v_run_id;

  for r in select * from jsonb_array_elements(payload->'results')
  loop
    insert into public.site_results (
      run_id, name, url, industry,
      score, lcp, cls, tbt, fcp, si, tti,
      total_size_kb, total_requests, third_party_ratio,
      raw
    ) values (
      v_run_id,
      coalesce(r->>'name', 'unknown'),
      coalesce(r->>'url', 'unknown'),
      nullif(r->>'industry', ''),
      nullif(r->>'score', '')::numeric,
      nullif(r->>'lcp', '')::numeric,
      nullif(r->>'cls', '')::numeric,
      nullif(r->>'tbt', '')::numeric,
      nullif(r->>'fcp', '')::numeric,
      nullif(r->>'si', '')::numeric,
      nullif(r->>'tti', '')::numeric,
      nullif(r->>'total_size_kb', '')::numeric,
      nullif(r->>'total_requests', '')::integer,
      nullif(r->>'third_party_ratio', '')::numeric,
      r
    );
  end loop;

  return v_run_id;
end;
$$;

revoke execute on function public.submit_run(jsonb) from public;
grant execute on function public.submit_run(jsonb) to anon;
