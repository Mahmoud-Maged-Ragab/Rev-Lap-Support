import type { DraftAttachment } from "@/components/attachments/types";

export type DraftSection = {
  clientId: string;
  id?: string;
  title: string;
  content: string;
  attachments: DraftAttachment[];
};

export function newSectionClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s${Date.now()}${Math.random().toString(16).slice(2)}`;
}
