"use client";

import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconGripVertical,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { AttachmentUploader } from "@/components/attachments/AttachmentUploader";
import { VideoAttachmentField } from "@/components/issue-form/VideoAttachmentField";
import type { AttachmentKind, DraftAttachment } from "@/components/attachments/types";
import { ELEMENT_ATTACHMENT_KIND, getSectionElementDef, isMediaElementType } from "@/lib/sectionElements";
import { RichTextEditor } from "./RichTextEditor";
import type { DraftSection } from "./types";

/** One content element in the builder — legacy sections keep their original
 *  full title+content+attachments editor; anything added via the Elements
 *  panel renders just the one control its type actually needs. Hover (or
 *  tap-select, for touch) reveals a small floating toolbar — drag / edit /
 *  duplicate / delete — instead of permanently cluttering the block, so the
 *  canvas reads like a real page-builder rather than a stacked form. */
export function SectionEditor({
  section,
  index,
  total,
  selected,
  onSelect,
  onChange,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  section: DraftSection;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<DraftSection>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.clientId,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const contentRef = useRef<HTMLDivElement>(null);

  const isLegacy = section.type === "legacy";
  const elementDef = isLegacy ? undefined : getSectionElementDef(section.type);
  const label = elementDef?.label ?? "Section";

  function focusContent() {
    onSelect();
    contentRef.current?.querySelector<HTMLElement>("input, textarea")?.focus();
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={
        "group relative rounded-lg border bg-white p-4 transition-shadow " +
        (isDragging ? "z-10 shadow-md " : "") +
        (selected ? "border-accent ring-2 ring-accent/40" : "border-slate-200 hover:border-slate-300")
      }
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {isLegacy ? (
          <div className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
            {index + 1}
          </div>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
            {elementDef && <elementDef.icon size={12} />}
            {label}
          </span>
        )}

        {/* Floating toolbar: visible on hover (desktop) or while selected
           (works via tap on touch devices, where hover doesn't apply). */}
        <div
          className={
            "flex shrink-0 items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 shadow-sm transition-opacity " +
            (selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100")
          }
        >
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab touch-none rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
            aria-label={`Drag to reorder ${label}`}
            {...attributes}
            {...listeners}
          >
            <IconGripVertical size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={index === 0}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 sm:hidden"
            aria-label={`Move ${label} up`}
          >
            <IconChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={index === total - 1}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 sm:hidden"
            aria-label={`Move ${label} down`}
          >
            <IconChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              focusContent();
            }}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={`Edit ${label}`}
          >
            <IconPencil size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={`Duplicate ${label}`}
          >
            <IconCopy size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${label}`}
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>

      <div ref={contentRef}>
        {isLegacy && (
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
        )}

        {section.type === "headline" && (
          <input
            type="text"
            className="input !h-12 !text-xl !font-semibold"
            value={section.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Large heading text"
            maxLength={200}
            aria-label="Headline text"
          />
        )}

        {section.type === "subheadline" && (
          <input
            type="text"
            className="input !text-base !font-medium"
            value={section.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Secondary heading text"
            maxLength={200}
            aria-label="Sub headline text"
          />
        )}

        {section.type === "paragraph" && (
          <textarea
            className="textarea"
            value={section.content}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder="Write a paragraph of body text…"
            maxLength={10000}
            aria-label="Paragraph text"
          />
        )}

        {section.type === "richtext" && (
          <RichTextEditor value={section.content} onChange={(content) => onChange({ content })} />
        )}

        {section.type === "video" && (
          <VideoAttachmentField
            idPrefix={`element-${section.clientId}`}
            attachments={section.attachments}
            onChange={(attachments) => onChange({ attachments })}
          />
        )}

        {isMediaElementType(section.type) && section.type !== "video" && (
          <AttachmentUploader
            idPrefix={`element-${section.clientId}`}
            attachments={section.attachments}
            allowedKinds={[ELEMENT_ATTACHMENT_KIND[section.type] as AttachmentKind]}
            label={
              section.type === "pdf" ? "Add PDF" : section.type === "doc" ? "Add document" : "Add images"
            }
            hint={
              section.type === "pdf"
                ? "PDF files — rendered in-app."
                : section.type === "doc"
                  ? "DOC/DOCX files."
                  : "PNG, JPG, WEBP, GIF — multiple at once, each with its own caption."
            }
            onChange={(attachments) => onChange({ attachments })}
          />
        )}
      </div>
    </div>
  );
}
