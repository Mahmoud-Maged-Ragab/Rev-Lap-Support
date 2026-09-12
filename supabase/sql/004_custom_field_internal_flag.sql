-- Marks a custom field definition as internal-only: Support/Admin can still
-- see and fill it in on the authoring/edit form, but its value must NEVER
-- reach the public, client-facing issue page (src/app/issues/[slug]/page.tsx
-- filters on this column). Used for the "Internal Notes" predefined field
-- (see lib/customFieldCatalog.ts) and any future field meant to stay
-- support-team-only.
--
-- Run this once in the Supabase Dashboard → SQL Editor. Additive/idempotent.

alter table issue_custom_fields
  add column if not exists internal boolean not null default false;

notify pgrst, 'reload schema';