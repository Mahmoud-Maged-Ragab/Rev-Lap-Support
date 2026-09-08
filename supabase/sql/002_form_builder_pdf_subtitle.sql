-- Adds:
--   1. issues.subtitle          — new optional field for the configurable form builder
--   2. issue_attachments.kind   — widened to a first-class 'pdf' kind (was lumped into
--                                 'document' alongside .doc/.docx); backfills existing rows
--   3. issue_form_config        — singleton row storing the Issue Creation field order/
--                                 enabled state configured via the drag-and-drop form builder
--
-- Run this once in the Supabase Dashboard → SQL Editor. Additive/idempotent: safe to re-run.

alter table issues add column if not exists subtitle text;

alter table issue_attachments drop constraint if exists issue_attachments_kind_check;
alter table issue_attachments add constraint issue_attachments_kind_check
  check (kind in ('image', 'video', 'pdf', 'document'));

update issue_attachments
  set kind = 'pdf'
  where kind = 'document' and mime = 'application/pdf';

create table if not exists issue_form_config (
  id text primary key,
  fields jsonb not null,
  "updatedAt" timestamptz not null default now(),
  "updatedBy" text
);

alter table issue_form_config enable row level security;

-- Make PostgREST pick up the new column/table immediately.
notify pgrst, 'reload schema';
