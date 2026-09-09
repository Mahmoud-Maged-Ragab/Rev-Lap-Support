import {
  IconFileTypeDoc,
  IconFileTypePdf,
  IconH1,
  IconH2,
  IconPhoto,
  IconPilcrow,
  IconTypography,
  IconVideo,
  type Icon,
} from "@tabler/icons-react";

/**
 * Every content element Support/Admin can add to the Issue Builder via the
 * "Add Element" slide-out menu (see AddElementMenu.tsx). Backed by
 * `issue_sections.type` (supabase/sql/005_section_element_type.sql) — a
 * `'legacy'` section (pre-dating this feature, or created by the old
 * "+ Add section" flow) isn't in this catalog and keeps its own full
 * title+content+attachments editor/renderer, untouched.
 */
export type SectionElementType =
  | "headline"
  | "subheadline"
  | "paragraph"
  | "richtext"
  | "video"
  | "pdf"
  | "doc"
  | "image";

export type SectionElementDef = {
  type: SectionElementType;
  label: string;
  description: string;
  icon: Icon;
};

export const SECTION_ELEMENTS: SectionElementDef[] = [
  { type: "headline", label: "Headline", description: "Large heading", icon: IconH1 },
  { type: "subheadline", label: "Sub Headline", description: "Secondary heading", icon: IconH2 },
  { type: "paragraph", label: "Paragraph", description: "Normal text", icon: IconPilcrow },
  { type: "richtext", label: "Rich Text", description: "Formatted text", icon: IconTypography },
  { type: "video", label: "Video", description: "Add a video", icon: IconVideo },
  { type: "pdf", label: "PDF", description: "Add a PDF document", icon: IconFileTypePdf },
  { type: "doc", label: "DOC", description: "Add a DOC/DOCX file", icon: IconFileTypeDoc },
  { type: "image", label: "Image", description: "Add an image", icon: IconPhoto },
];

const BY_TYPE = new Map(SECTION_ELEMENTS.map((e) => [e.type, e]));

export function getSectionElementDef(type: string): SectionElementDef | undefined {
  return BY_TYPE.get(type as SectionElementType);
}

/** Attachment `kind` each media element type restricts its uploader to. */
export const ELEMENT_ATTACHMENT_KIND = {
  video: "video",
  pdf: "pdf",
  doc: "document",
  image: "image",
} as const;

export function isMediaElementType(
  type: SectionElementType | "legacy",
): type is "video" | "pdf" | "doc" | "image" {
  return type === "video" || type === "pdf" || type === "doc" || type === "image";
}
