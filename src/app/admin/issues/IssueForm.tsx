"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
  IconPencil,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import type { AttachmentKind, DraftAttachment } from "@/components/attachments/types";
import { AttachmentUploader } from "@/components/attachments/AttachmentUploader";
import { VideoAttachmentField } from "@/components/issue-form/VideoAttachmentField";
import { SectionsList } from "@/components/issue-form/SectionsList";
import type { DraftSection } from "@/components/issue-form/types";
import { CustomFieldModal } from "@/components/issue-form/CustomFieldModal";
import { CustomFieldInput } from "@/components/issue-form/CustomFieldInput";
import type { CustomFieldDef } from "@/lib/customFields";
import {
  DEFAULT_FIELD_CONFIG,
  FIELD_REGISTRY,
  addNewFieldEnabled,
  customFieldIdFromKey,
  customFieldLayoutKey,
  enabledFieldOrder,
  isCustomFieldKey,
  isFieldKey,
  isRequiredField,
  moveEnabledField,
  removeFieldEntry,
  reorderEnabledFields,
  setFieldEnabled,
  type FieldConfigEntry,
  type FieldKey,
  type LayoutKey,
} from "@/lib/issueFormFields";

type InitialAttachment = {
  id: string;
  kind: AttachmentKind;
  url: string | null;
  storagePath: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  caption: string | null;
};

type InitialSection = {
  id: string;
  title: string;
  content: string;
  attachments: InitialAttachment[];
};

type InitialCustomFieldValue = { fieldId: string; value: string | null };

export type IssueFormInitial = {
  id?: string;
  title?: string;
  subtitle?: string | null;
  description?: string;
  categoryId?: string | null;
  tags?: { id: string; name: string }[];
  attachments?: InitialAttachment[];
  sections?: InitialSection[];
  customFields?: InitialCustomFieldValue[];
};

type TagOption = { id: string; name: string };

function toDraftAttachment(a: InitialAttachment): DraftAttachment {
  return {
    clientId: a.id,
    id: a.id,
    kind: a.kind,
    filename: a.filename,
    mime: a.mime,
    sizeBytes: a.sizeBytes,
    caption: a.caption ?? "",
    storagePath: a.storagePath,
    previewUrl: a.url ?? "",
    status: "ready",
  };
}

function toDraftSection(s: InitialSection): DraftSection {
  return {
    clientId: s.id,
    id: s.id,
    title: s.title,
    content: s.content,
    attachments: s.attachments.map(toDraftAttachment),
  };
}

function toAttachmentPayload(a: DraftAttachment) {
  return {
    id: a.id,
    kind: a.kind,
    storagePath: a.storagePath as string,
    filename: a.filename,
    mime: a.mime,
    sizeBytes: a.sizeBytes,
    caption: a.caption || null,
  };
}

/**
 * Drag handle + remove/edit-field row rendered above every field's own
 * content, directly on the Issue Creation/Edit form (there is no separate
 * builder page — dragging a field here reorders the real form immediately,
 * and the new order is autosaved to the shared layout config for all future
 * issues, custom fields included).
 */
function SortableFieldBlock({
  fieldKey,
  label,
  requiredBadge,
  onRemove,
  onEdit,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  children,
}: {
  fieldKey: LayoutKey;
  label: string;
  requiredBadge: boolean;
  onRemove: (() => void) | null;
  onEdit?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: fieldKey,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "rounded-md border border-transparent" +
        (isDragging ? " relative z-10 border-slate-200 bg-white shadow-md" : "")
      }
    >
      <div className="mb-1 flex items-center gap-1.5">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
          aria-label={`Drag to reorder ${label}`}
          {...attributes}
          {...listeners}
        >
          <IconGripVertical size={15} />
        </button>
        {requiredBadge && (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Required
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5 sm:hidden">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 disabled:opacity-30"
            aria-label={`Move ${label} up`}
          >
            <IconChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 disabled:opacity-30"
            aria-label={`Move ${label} down`}
          >
            <IconChevronDown size={14} />
          </button>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className={"rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600" + (onRemove ? "" : " ml-auto sm:ml-0")}
            aria-label={`Edit ${label}`}
          >
            <IconPencil size={14} />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className={"rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600" + (onEdit ? "" : " ml-auto sm:ml-0")}
            aria-label={`Remove ${label} from the form`}
          >
            <IconX size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function IssueForm({
  initial,
  categories,
  allTags,
  customFields = [],
  fieldConfig: initialFieldConfig = DEFAULT_FIELD_CONFIG,
}: {
  initial?: IssueFormInitial;
  categories: { id: string; name: string }[];
  allTags: TagOption[];
  /** All non-archived custom field definitions (data-driven — see
   *  lib/customFields.ts). IssueForm owns adding/editing/removing them
   *  inline via the "+ Add Custom Field" flow below. */
  customFields?: CustomFieldDef[];
  /** Saved layout (order + enabled state) for the fields below, built-in
   *  and custom alike. Dragging/adding/removing a field here immediately
   *  re-saves this same shared config via PUT /api/issue-form-config, so it
   *  also becomes the default for every future issue. Falls back to the
   *  built-in default layout if not provided (e.g. before the config
   *  migration is applied). */
  fieldConfig?: FieldConfigEntry[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    () => new Set((initial?.tags ?? []).map((t) => t.id)),
  );
  const [attachments, setAttachments] = useState<DraftAttachment[]>(() =>
    (initial?.attachments ?? []).map(toDraftAttachment),
  );
  const [sections, setSections] = useState<DraftSection[]>(() =>
    (initial?.sections ?? []).map(toDraftSection),
  );
  const [fieldConfig, setFieldConfigState] = useState<FieldConfigEntry[]>(initialFieldConfig);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>(customFields);
  const [customValues, setCustomValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((initial?.customFields ?? []).map((v) => [v.fieldId, v.value ?? ""])),
  );
  const [fieldModal, setFieldModal] = useState<"new" | CustomFieldDef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(initial?.id);
  const customFieldById = useMemo(
    () => new Map(customFieldDefs.map((f) => [f.id, f])),
    [customFieldDefs],
  );
  const rawFieldOrder = useMemo(() => enabledFieldOrder(fieldConfig), [fieldConfig]);
  // Drop any custom:<id> layout entry whose field no longer exists (e.g. it
  // was deleted from another session) so the form never renders a blank row.
  const fieldOrder = useMemo(
    () =>
      rawFieldOrder.filter((k) => (isCustomFieldKey(k) ? customFieldById.has(customFieldIdFromKey(k)!) : true)),
    [rawFieldOrder, customFieldById],
  );
  const disabledBuiltIns = useMemo(() => fieldConfig.filter((f) => !f.enabled && isFieldKey(f.key)), [fieldConfig]);
  const unusedCustomFields = useMemo(() => {
    const active = new Set(fieldOrder.filter(isCustomFieldKey).map((k) => customFieldIdFromKey(k)!));
    return customFieldDefs.filter((f) => !active.has(f.id));
  }, [fieldOrder, customFieldDefs]);
  const tagsEnabled = fieldOrder.includes("tags");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const uploadingCount = useMemo(() => {
    const inSections = sections.reduce(
      (n, s) => n + s.attachments.filter((a) => a.status === "uploading").length,
      0,
    );
    return (
      inSections + attachments.filter((a) => a.status === "uploading").length
    );
  }, [attachments, sections]);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function attachmentsOf(kind: AttachmentKind): DraftAttachment[] {
    return attachments.filter((a) => a.kind === kind);
  }

  function setAttachmentsOf(kind: AttachmentKind, next: DraftAttachment[]) {
    setAttachments((prev) => [...prev.filter((a) => a.kind !== kind), ...next]);
  }

  async function persistFieldConfig(next: FieldConfigEntry[]) {
    setFieldConfigState(next);
    setLayoutSaving(true);
    try {
      await fetch("/api/issue-form-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields: next }),
      });
    } catch {
      // Best-effort: the layout still applies to this session even if the
      // shared save failed (e.g. offline) — nothing else depends on it.
    } finally {
      setLayoutSaving(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    persistFieldConfig(reorderEnabledFields(fieldConfig, active.id as LayoutKey, over.id as LayoutKey));
  }

  function handleFieldSaved(field: CustomFieldDef) {
    const wasNew = fieldModal === "new";
    setCustomFieldDefs((prev) =>
      prev.some((f) => f.id === field.id) ? prev.map((f) => (f.id === field.id ? field : f)) : [...prev, field],
    );
    if (wasNew) {
      persistFieldConfig(addNewFieldEnabled(fieldConfig, customFieldLayoutKey(field.id)));
    }
    setFieldModal(null);
  }

  function handleFieldDeleted(fieldId: string) {
    setCustomFieldDefs((prev) => prev.filter((f) => f.id !== fieldId));
    persistFieldConfig(removeFieldEntry(fieldConfig, customFieldLayoutKey(fieldId)));
    setCustomValues((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    setFieldModal(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tagsEnabled && selectedTagIds.size === 0) {
      setError("Please select at least one tag.");
      return;
    }
    for (const key of fieldOrder) {
      if (!isCustomFieldKey(key)) continue;
      const field = customFieldById.get(customFieldIdFromKey(key)!);
      if (field?.required && !(customValues[field.id] ?? "").trim()) {
        setError(`${field.label} is required.`);
        return;
      }
    }
    if (uploadingCount > 0) {
      setError("Please wait for all files to finish uploading.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        subtitle: subtitle.trim() || null,
        description,
        categoryId: categoryId || null,
        tagIds: Array.from(selectedTagIds),
        attachments: attachments
          .filter((a) => a.status === "ready" && a.storagePath)
          .map(toAttachmentPayload),
        sections: sections.map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content,
          attachments: s.attachments
            .filter((a) => a.status === "ready" && a.storagePath)
            .map(toAttachmentPayload),
        })),
        customFieldValues: Object.entries(customValues)
          .filter(([fieldId]) => customFieldById.has(fieldId))
          .map(([fieldId, value]) => ({ fieldId, value: value || null })),
      };
      const url = isEdit ? `/api/issues/${initial!.id}` : "/api/issues";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const fieldRenderers: Record<FieldKey, () => React.ReactNode> = {
    title: () => (
      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          className="input"
          required
          minLength={3}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
    ),
    subtitle: () => (
      <div>
        <label className="label" htmlFor="subtitle">
          Subtitle
        </label>
        <input
          id="subtitle"
          className="input"
          maxLength={300}
          placeholder="Optional short sub-heading"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />
      </div>
    ),
    description: () => (
      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          className="textarea"
          required
          minLength={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    ),
    category: () => (
      <div>
        <label className="label" htmlFor="category">
          Category
        </label>
        <select
          id="category"
          className="select"
          value={categoryId ?? ""}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">— None —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    ),
    tags: () => (
      <div>
        <div className="flex items-baseline justify-between">
          <span className="label">Tags</span>
          <span className="text-xs text-slate-500">
            {selectedTagIds.size} selected
          </span>
        </div>
        {allTags.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tags yet. Create some in the Tags page first.
          </p>
        ) : (
          <div className="flex max-h-[90px] flex-wrap gap-2 overflow-y-auto rounded-md border border-slate-200 p-3">
            {allTags.map((t) => {
              const active = selectedTagIds.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  aria-pressed={active}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-medium transition " +
                    (active
                      ? "border-accent bg-accent text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50")
                  }
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    ),
    images: () => (
      <div>
        <label className="label">Images</label>
        <AttachmentUploader
          idPrefix="issue-images"
          allowedKinds={["image"]}
          label="Add images"
          hint="PNG, JPG, WEBP, GIF — multiple at once, each with its own caption."
          attachments={attachmentsOf("image")}
          onChange={(next) => setAttachmentsOf("image", next)}
        />
      </div>
    ),
    videos: () => (
      <div>
        <label className="label">Videos</label>
        <VideoAttachmentField
          idPrefix="issue-videos"
          attachments={attachmentsOf("video")}
          onChange={(next) => setAttachmentsOf("video", next)}
        />
      </div>
    ),
    pdf: () => (
      <div>
        <label className="label">PDF</label>
        <AttachmentUploader
          idPrefix="issue-pdf"
          allowedKinds={["pdf"]}
          label="Add PDF"
          hint="PDF files — rendered in-app, multiple allowed."
          attachments={attachmentsOf("pdf")}
          onChange={(next) => setAttachmentsOf("pdf", next)}
        />
      </div>
    ),
    documents: () => (
      <div>
        <label className="label">Documents</label>
        <AttachmentUploader
          idPrefix="issue-documents"
          allowedKinds={["document"]}
          label="Add document"
          hint="Legacy .doc/.docx files."
          attachments={attachmentsOf("document")}
          onChange={(next) => setAttachmentsOf("document", next)}
        />
      </div>
    ),
  };

  function renderField(key: LayoutKey): React.ReactNode {
    if (isCustomFieldKey(key)) {
      const field = customFieldById.get(customFieldIdFromKey(key)!);
      if (!field) return null;
      return (
        <div>
          <label className="label" htmlFor={`custom-field-${field.id}`}>
            {field.label}
          </label>
          <CustomFieldInput
            field={field}
            value={customValues[field.id] ?? ""}
            onChange={(v) => setCustomValues((prev) => ({ ...prev, [field.id]: v }))}
          />
          {field.description && <p className="mt-1 text-xs text-slate-500">{field.description}</p>}
        </div>
      );
    }
    return isFieldKey(key) ? fieldRenderers[key]?.() : null;
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Drag <IconGripVertical size={12} className="inline align-text-top" /> to reorder fields —
          changes apply to every future issue too.
        </p>
        {layoutSaving && <span className="text-xs text-slate-400">Saving layout…</span>}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fieldOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-5">
            {fieldOrder.map((key, i) => {
              const custom = isCustomFieldKey(key);
              const customDef = custom ? customFieldById.get(customFieldIdFromKey(key)!) : undefined;
              const label = custom ? (customDef?.label ?? "Custom field") : FIELD_REGISTRY[key as FieldKey].label;
              return (
                <SortableFieldBlock
                  key={key}
                  fieldKey={key}
                  label={label}
                  requiredBadge={custom ? !!customDef?.required : isRequiredField(key)}
                  canMoveUp={i > 0}
                  canMoveDown={i < fieldOrder.length - 1}
                  onMoveUp={() => persistFieldConfig(moveEnabledField(fieldConfig, key, -1))}
                  onMoveDown={() => persistFieldConfig(moveEnabledField(fieldConfig, key, 1))}
                  onEdit={custom && customDef ? () => setFieldModal(customDef) : undefined}
                  onRemove={
                    !custom && isRequiredField(key)
                      ? null
                      : () => persistFieldConfig(setFieldEnabled(fieldConfig, key, false))
                  }
                >
                  {renderField(key)}
                </SortableFieldBlock>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap items-center gap-2">
        {(disabledBuiltIns.length > 0 || unusedCustomFields.length > 0) && (
          <span className="text-xs text-slate-500">Add field:</span>
        )}
        {disabledBuiltIns.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => persistFieldConfig(setFieldEnabled(fieldConfig, f.key, true))}
            className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-50"
          >
            + {FIELD_REGISTRY[f.key as FieldKey].label}
          </button>
        ))}
        {unusedCustomFields.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => persistFieldConfig(addNewFieldEnabled(fieldConfig, customFieldLayoutKey(f.id)))}
            className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-50"
          >
            + {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFieldModal("new")}
          className="rounded-full border border-dashed border-accent px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/5"
        >
          <IconPlus size={12} className="mr-1 inline" /> Add Custom Field
        </button>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <SectionsList sections={sections} onChange={setSections} />
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-slate-200 pt-4">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create issue"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn">
          Cancel
        </button>
      </div>

      {fieldModal && (
        <CustomFieldModal
          initial={fieldModal === "new" ? undefined : fieldModal}
          onClose={() => setFieldModal(null)}
          onSaved={handleFieldSaved}
          onDeleted={fieldModal !== "new" ? handleFieldDeleted : undefined}
        />
      )}
    </form>
  );
}
