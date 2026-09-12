-- =====================================================================
-- RLS security hardening — full audit migration (2026-09-09)
-- =====================================================================
--
-- READ THIS FIRST — this project's access-control architecture:
--
-- Every DB call this app makes (src/lib/supabase.ts, src/lib/uploads.ts)
-- uses the Supabase SERVICE ROLE key, server-side only, from Next.js API
-- routes / server components. `service_role` has BYPASSRLS in Supabase, so
-- it ignores RLS/policies entirely, on every table, always. The browser
-- never receives a Supabase key (no NEXT_PUBLIC_SUPABASE_* var exists, no
-- client component imports @supabase/supabase-js — verified against the
-- whole src/ tree). So today, `anon`/`authenticated` Postgres roles are
-- never exercised by legitimate traffic; the actual authorization boundary
-- is Next.js middleware.ts + src/lib/permissions.ts + each API route's own
-- session check.
--
-- That means RLS here is NOT the primary authorization mechanism (it
-- structurally can't be — there is no Supabase Auth session, so
-- auth.uid() is always NULL, and Postgres has no concept of this app's
-- OWNER/ADMIN/SUPPORT roles, which live only in a custom JWT verified by
-- `jose`/AUTH_SECRET). RLS here is DEFENSE IN DEPTH against:
--   1. src/lib/supabase.ts's own documented fallback: if
--      SUPABASE_SERVICE_ROLE_KEY is ever unset in an environment, it falls
--      back to SUPABASE_ANON_KEY for ALL server DB calls. Without RLS, a
--      misconfigured deploy would silently serve/accept requests as `anon`
--      with full table access. WITH RLS deny-all, that misconfiguration
--      instead fails closed (every query returns nothing / every write is
--      rejected) — loud and safe, not silent and open.
--   2. Any future leak of the anon key into client code, logs, or a
--      different service.
--   3. Anyone hitting the raw PostgREST endpoint directly with the anon key
--      (which is not secret by Supabase convention — it's designed to be
--      publishable — so it must never be the thing standing between an
--      attacker and this data).
--
-- Policy: NO anon/authenticated policy is created for ANY table or for
-- Storage in this migration. Every table becomes fully inaccessible to
-- anon/authenticated; service_role is completely unaffected (bypasses RLS
-- by role attribute, not by policy) and the app keeps working exactly as
-- it does today with ZERO code changes required.
--
-- This app also has NO multi-tenant/agency concept and NO end-user account
-- system (verified: no "tenant"/"agency" table or column anywhere in
-- src/, only the `admins` table with roles OWNER/ADMIN/SUPPORT; public
-- visitors browse issues anonymously with no account at all; "saved
-- issues" is a browser cookie, not a DB row). Sections 6/7 of the audit
-- prompt (tenant isolation, per-tenant policies) are N/A for this schema —
-- see the chat response's Section A for the full explanation. Nothing in
-- this migration invents tenant/agency structure that doesn't exist.
--
-- Tables covered (the complete set found in the repository — six from this
-- repo's own migrations 001-005, plus six pre-existing tables reconstructed
-- from every read/write call site in src/, since no CREATE TABLE for them
-- exists in this repo and no DB introspection tool is available in this
-- environment): admins, issues, categories, tags, issue_tags,
-- issue_sections, issue_attachments, issue_form_config,
-- issue_custom_fields, issue_custom_field_values, issue_history,
-- audit_logs.
--
-- issue_custom_fields / issue_custom_field_values are no longer referenced
-- by the app (the custom-field feature was removed in favor of the
-- Elements/Sections system earlier this session) but still exist in the DB
-- with potentially real historical data — RLS-hardened the same as every
-- other table rather than left exposed.
--
-- UNKNOWN / could not be verified from the repository (no psql/DB
-- introspection tool available in this environment — see the "Verification
-- SQL" block at the end, run it BEFORE this migration if you want to know
-- prior state): whether RLS was already enabled on the six pre-existing
-- tables, and whether any policy already exists on them. This migration
-- does not assume either way — it unconditionally enables RLS and
-- unconditionally drops every existing policy on all twelve tables (see
-- the DO block below), so the end state is correct regardless of the
-- starting state.
--
-- Safe to run against a live database: it only ever *removes* anon/
-- authenticated access and *adds* RLS. It cannot break the app, because
-- the app never uses anon/authenticated to reach these tables (see above).
-- Idempotent: safe to re-run.

-- =====================================================================
-- Enable RLS (+ FORCE, so even a future non-owner, non-bypassrls role
-- can never accidentally see past it) on every table in this project.
-- =====================================================================

alter table public.admins                     enable row level security;
alter table public.admins                     force  row level security;

alter table public.issues                     enable row level security;
alter table public.issues                     force  row level security;

alter table public.categories                 enable row level security;
alter table public.categories                 force  row level security;

alter table public.tags                       enable row level security;
alter table public.tags                       force  row level security;

alter table public.issue_tags                 enable row level security;
alter table public.issue_tags                 force  row level security;

alter table public.issue_sections             enable row level security;
alter table public.issue_sections             force  row level security;

alter table public.issue_attachments          enable row level security;
alter table public.issue_attachments          force  row level security;

alter table public.issue_form_config          enable row level security;
alter table public.issue_form_config          force  row level security;

alter table public.issue_custom_fields        enable row level security;
alter table public.issue_custom_fields        force  row level security;

alter table public.issue_custom_field_values  enable row level security;
alter table public.issue_custom_field_values  force  row level security;

alter table public.issue_history              enable row level security;
alter table public.issue_history              force  row level security;

alter table public.audit_logs                 enable row level security;
alter table public.audit_logs                 force  row level security;

-- =====================================================================
-- Helper functions
-- =====================================================================
--
-- None are created. There is nothing meaningful for a helper function to
-- check: no auth.uid() (no Supabase Auth session ever reaches Postgres —
-- this app's admin identity/role lives only in a custom JWT verified in
-- Next.js, never forwarded to Postgres as a claim), and no tenant/agency
-- column to compare against. A helper function here would either be dead
-- code or security theater. If this app is ever migrated to real Supabase
-- Auth for admins (so auth.uid()/auth.jwt() actually carries their role),
-- that is the point at which role-aware policies and a
-- `public.current_admin_role()` SECURITY DEFINER helper (search_path
-- pinned to `public, pg_temp`, as Supabase's own guidance requires) would
-- become meaningful — not before.

-- =====================================================================
-- Table policies
-- =====================================================================
--
-- Unconditionally drop every existing policy on these 12 tables — covers
-- both "unsafe permissive policy left over from earlier work" (e.g. a
-- `USING (true)` policy) and "unknown prior state" (see header) in one
-- idempotent step, without needing to know any policy's name in advance.
-- After this runs, each table has RLS enabled and ZERO policies, which
-- means: zero rows visible/writable to `anon` or `authenticated`, and
-- `service_role` (this app's only real caller) completely unaffected.

do $$
declare
  pol record;
  target_tables text[] := array[
    'admins', 'issues', 'categories', 'tags', 'issue_tags',
    'issue_sections', 'issue_attachments', 'issue_form_config',
    'issue_custom_fields', 'issue_custom_field_values',
    'issue_history', 'audit_logs'
  ];
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(target_tables)
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    raise notice 'Dropped policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
  end loop;
end $$;

-- Belt-and-suspenders: also revoke any standing table-level grants Supabase
-- may have given anon/authenticated by default (RLS with zero policies
-- already blocks all row access regardless of these grants — this just
-- means a future accidental RLS-disable in the dashboard doesn't alone
-- reopen access; the grant would still be gone).

revoke all on public.admins                    from anon, authenticated;
revoke all on public.issues                    from anon, authenticated;
revoke all on public.categories                from anon, authenticated;
revoke all on public.tags                      from anon, authenticated;
revoke all on public.issue_tags                from anon, authenticated;
revoke all on public.issue_sections            from anon, authenticated;
revoke all on public.issue_attachments         from anon, authenticated;
revoke all on public.issue_form_config         from anon, authenticated;
revoke all on public.issue_custom_fields       from anon, authenticated;
revoke all on public.issue_custom_field_values from anon, authenticated;
revoke all on public.issue_history             from anon, authenticated;
revoke all on public.audit_logs                from anon, authenticated;

-- No CREATE POLICY statements follow, deliberately — see the header
-- comment. `service_role` needs none (bypasses RLS) and no other role
-- should ever reach these tables.

-- =====================================================================
-- Storage policies
-- =====================================================================
--
-- Bucket "issues" (src/lib/uploads.ts's ATTACHMENT_BUCKET) holds every
-- image/video/PDF/DOC/DOCX attachment. It's already accessed exclusively
-- server-side via the service-role Storage client — uploads go through
-- POST /api/upload, downloads/previews go through short-lived signed URLs
-- minted server-side (signPaths, 1h expiry) — the browser never talks to
-- Supabase Storage directly (no client-side @supabase/supabase-js usage
-- exists anywhere in src/). So, same reasoning as above: no
-- anon/authenticated policy should exist on storage.objects for this
-- bucket at all.
--
-- Ensure the bucket is private (idempotent — safe even if already false):
update storage.buckets set public = false where id = 'issues';
--
-- This migration deliberately does NOT drop or alter any existing
-- storage.objects policy, because policy names are not knowable from this
-- repository and a blind drop on storage.objects could remove a policy
-- belonging to a DIFFERENT bucket this project might have that the app
-- code never touches. Run the storage verification query below FIRST:
-- if it returns any row, paste the output back so exact, scoped
-- `DROP POLICY` statements can be written for review before running.

-- =====================================================================
-- Post-migration: make PostgREST pick this up immediately.
-- =====================================================================

notify pgrst, 'reload schema';
