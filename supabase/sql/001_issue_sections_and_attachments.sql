-- Issue sections + attachments (with per-attachment captions).
--
-- Run this once in the Supabase Dashboard → SQL Editor (or via `psql`) for
-- this project. It is additive only: no existing columns are dropped and no
-- existing data is touched. Safe to re-run (uses IF NOT EXISTS throughout).
--
-- Architecture:
--   issues (existing)
--     └── issue_sections   (optional; a detailed issue groups content here)
--           └── issue_attachments  (image | video | document, each with its
--                                   own optional caption)
--   issue_attachments also has a direct issueId, so a "quick" issue can
--   attach files without creating a section (sectionId left null).

create table if not exists issue_sections (
  id text primary key,
  "issueId" text not null references issues(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  position integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists issue_sections_issueid_idx on issue_sections ("issueId");

create table if not exists issue_attachments (
  id text primary key,
  "issueId" text not null references issues(id) on delete cascade,
  "sectionId" text references issue_sections(id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'document')),
  "storagePath" text not null,
  filename text not null,
  mime text not null,
  "sizeBytes" bigint not null default 0,
  caption text,
  position integer not null default 0,
  "createdAt" timestamptz not null default now()
);

create index if not exists issue_attachments_issueid_idx on issue_attachments ("issueId");
create index if not exists issue_attachments_sectionid_idx on issue_attachments ("sectionId");

-- Defense in depth: these tables are only ever touched server-side via the
-- service_role key (same model as every other table in this project — see
-- src/lib/supabase.ts). RLS is enabled with no anon/authenticated policies,
-- so even if the Data API is ever queried with a different key, these rows
-- stay inaccessible.
alter table issue_sections enable row level security;
alter table issue_attachments enable row level security;

-- `solution` already allows NULL at the DB level (verified against the live
-- schema before writing this migration), so no ALTER is needed there — only
-- the Zod validator (src/lib/validation.ts) needed to relax that field.

-- Make PostgREST pick up the new tables immediately instead of waiting for
-- its schema-cache poll interval.
notify pgrst, 'reload schema';
