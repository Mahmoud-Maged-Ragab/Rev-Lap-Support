-- Custom fields for the Issue Creation form builder.
--
-- issue_custom_fields        — field definitions (data-driven, not hardcoded).
-- issue_custom_field_values  — one value per (issue, field), the actual data
--                               entered when authoring an issue.
--
-- Deleting a field is a SOFT delete (`archived = true`): it disappears from
-- the builder's "add field" list and from new issues, but the definition row
-- and every historical value stay intact — required so removing/renaming a
-- field never silently destroys data on issues that already used it.
--
-- Run this once in the Supabase Dashboard → SQL Editor. Additive/idempotent.

create table if not exists issue_custom_fields (
  id text primary key,
  name text not null,
  label text not null,
  type text not null check (
    type in ('text','textarea','number','date','select','checkbox','radio','url','email','phone','multiselect')
  ),
  required boolean not null default false,
  placeholder text,
  description text,
  options jsonb,
  position integer not null default 0,
  archived boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists issue_custom_fields_archived_idx on issue_custom_fields (archived);

create table if not exists issue_custom_field_values (
  id text primary key,
  "issueId" text not null references issues(id) on delete cascade,
  "fieldId" text not null references issue_custom_fields(id) on delete restrict,
  value text,
  "createdAt" timestamptz not null default now()
);

create unique index if not exists issue_custom_field_values_issue_field_idx
  on issue_custom_field_values ("issueId", "fieldId");
create index if not exists issue_custom_field_values_issueid_idx
  on issue_custom_field_values ("issueId");

alter table issue_custom_fields enable row level security;
alter table issue_custom_field_values enable row level security;

notify pgrst, 'reload schema';
