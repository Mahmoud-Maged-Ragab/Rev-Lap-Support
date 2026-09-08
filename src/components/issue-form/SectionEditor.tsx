"use client";

import {
  IconChevronDown,
  IconChevronUp,
  IconTrash,
} from "@tabler/icons-react";
import { AttachmentUploader } from "@/components/attachments/AttachmentUploader";
import type { DraftAttachment } from "@/components/attachments/types";
import type { DraftSection } from "./types";

export function SectionEditor({
  section,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  section: DraftSection;
  index: number;
  total: number;
  onChange: (patch: Partial<DraftSection>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
          {index + 1}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="btn btn-outline btn-sm !w-8 !px-0"
            aria-label="Move section up"
          >
            <IconChevronUp size={15} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="btn btn-outline btn-sm !w-8 !px-0"
            aria-label="Move section down"
          >
            <IconChevronDown size={15} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="btn btn-danger btn-sm"
          >
            <IconTrash size={15} className="mr-1.5" /> Remove
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="label">Section title</label>
          <input
            type="text"
            className="input"
            value={section.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g. Payment Error"
            maxLength={200}
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="textarea"
            value={section.content}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder="Describe what happens in this part of the issue…"
            maxLength={10000}
          />
        </div>

        <div>
          <label className="label">Attachments</label>
          <AttachmentUploader
            idPrefix={`section-${section.clientId}`}
            attachments={section.attachments}
            onChange={(attachments: DraftAttachment[]) => onChange({ attachments })}
          />
        </div>
      </div>
    </div>
  );
}
