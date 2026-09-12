-- Adds Google Drive link support to issue_attachments, alongside the
-- existing upload-based flow (Video / Image / PDF content elements can now
-- either upload a file or paste a Google Drive share link).
--
-- Every attachment row ever saved before this migration is an upload:
-- `source` backfills to 'upload' and `storagePath` stays required for those.
-- A Drive-linked attachment has no storage object at all — it stores the
-- original share URL in `externalUrl` instead, and `storagePath` is null.
--
-- Run this once in the Supabase Dashboard -> SQL Editor. Additive/idempotent:
-- safe to re-run, and existing uploaded attachments are completely unaffected.

alter table issue_attachments
  add column if not exists source text not null default 'upload';

alter table issue_attachments
  drop constraint if exists issue_attachments_source_check;
alter table issue_attachments
  add constraint issue_attachments_source_check
  check (source in ('upload', 'drive'));

alter table issue_attachments
  add column if not exists "externalUrl" text;

-- storagePath is only required for uploads now; a Drive-linked attachment
-- has none.
alter table issue_attachments
  alter column "storagePath" drop not null;

alter table issue_attachments
  drop constraint if exists issue_attachments_source_fields_check;
alter table issue_attachments
  add constraint issue_attachments_source_fields_check
  check (
    (source = 'upload' and "storagePath" is not null)
    or (source = 'drive' and "externalUrl" is not null)
  );

notify pgrst, 'reload schema';
