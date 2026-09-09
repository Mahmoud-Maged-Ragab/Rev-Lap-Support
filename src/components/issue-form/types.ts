import type { DraftAttachment } from "@/components/attachments/types";
import type { SectionElementType } from "@/lib/sectionElements";

/**
 * `type` is `"legacy"` for every section that predates the "Add Element"
 * menu (or was created by the old "+ Add section" flow it replaced) — those
 * keep the original free-form title+content+attachments editor. Anything
 * added through the menu gets one of the specific SectionElementType values
 * instead, each using only the one field it needs (see SectionEditor.tsx).
 */
export type DraftSection = {
  clientId: string;
  id?: string;
  type: SectionElementType | "legacy";
  title: string;
  content: string;
  attachments: DraftAttachment[];
};

export function newSectionClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s${Date.now()}${Math.random().toString(16).slice(2)}`;
}

export function newElementSection(type: SectionElementType): DraftSection {
  return { clientId: newSectionClientId(), type, title: "", content: "", attachments: [] };
}
