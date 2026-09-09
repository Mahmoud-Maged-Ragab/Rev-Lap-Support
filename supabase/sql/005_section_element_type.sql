-- Gives every `issue_sections` row an explicit content-element type, powering
-- the "Add Element" slide-out menu in the Issue Builder (Headline, Sub
-- Headline, Paragraph, Rich Text, Video, PDF, DOC, Image).
--
-- Every section ever saved before this migration has no notion of "type" —
-- it's a free-form title + description + mixed attachments block. Those
-- keep working exactly as before under the 'legacy' type (the default
-- backfilled onto existing rows), which the app still renders/edits with
-- its original full title+content+attachments UI. Only sections created
-- through the new "Add Element" menu get one of the specific types below,
-- each of which uses exactly one of title / content / attachments:
--   headline, subheadline  -> `title`
--   paragraph, richtext    -> `content` (richtext holds the app's own
--                              lightweight markdown syntax, see lib/richText.ts
--                              — never raw HTML from the client)
--   video, pdf, doc, image -> `attachments` (kind-restricted to match)
--
-- Run this once in the Supabase Dashboard → SQL Editor. Additive/idempotent.

alter table issue_sections
  add column if not exists type text not null default 'legacy';

alter table issue_sections
  drop constraint if exists issue_sections_type_check;

alter table issue_sections
  add constraint issue_sections_type_check
  check (type in ('legacy', 'headline', 'subheadline', 'paragraph', 'richtext', 'video', 'pdf', 'doc', 'image'));

notify pgrst, 'reload schema';
