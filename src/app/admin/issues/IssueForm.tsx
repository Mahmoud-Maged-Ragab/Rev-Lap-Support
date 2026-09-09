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
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import type {
  AttachmentKind,
  DraftAttachment,
} from "@/components/attachments/types";
import { AttachmentUploader } from "@/components/attachments/AttachmentUploader";
import { VideoAttachmentField } from "@/components/issue-form/VideoAttachmentField";
import { SectionsList } from "@/components/issue-form/SectionsList";
import type { DraftSection } from "@/components/issue-form/types";
import { SECTION_ELEMENTS, type SectionElementType } from "@/lib/sectionElements";
import {
  DEFAULT_FIELD_CONFIG,
  FIELD_REGISTRY,
  enabledFieldOrder,
  isRequiredField,
  moveEnabledField,
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
  type?: string;
  title: string;
  content: string;
  attachments: InitialAttachment[];
};

export type IssueFormInitial = {
  id?: string;
  title?: string;
  subtitle?: string | null;
  description?: string;
  categoryId?: string | null;
  tags?: { id: string; name: string }[];
  attachments?: InitialAttachment[];
  sections?: InitialSection[];
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

const KNOWN_ELEMENT_TYPES = new Set(SECTION_ELEMENTS.map((e) => e.type));

function toSectionType(type: string | undefined): SectionElementType | "legacy" {
  return type && KNOWN_ELEMENT_TYPES.has(type as SectionElementType)
    ? (type as SectionElementType)
    : "legacy";
}

function toDraftSection(s: InitialSection): DraftSection {
  return {
    clientId: s.id,
    id: s.id,
    type: toSectionType(s.type),
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
 * Drag handle + remove-field row rendered above every field's own content,
 * directly on the Issue Creation/Edit form (there is no separate builder
 * page — dragging a field here reorders the real form immediately, and the
 * new order is autosaved to the shared layout config for all future issues).
 */
function SortableFieldBlock({
  fieldKey,
  label,
  requiredBadge,
  onRemove,
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
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600 sm:ml-0"
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
  fieldConfig: initialFieldConfig = DEFAULT_FIELD_CONFIG,
}: {
  initial?: IssueFormInitial;
  categories: { id: string; name: string }[];
  allTags: TagOption[];
  /** Saved layout (order + enabled state) for the built-in fields below.
   *  Dragging/adding/removing a field here immediately re-saves this same
   *  shared config via PUT /api/issue-form-config, so it also becomes the
   *  default for every future issue. Falls back to the built-in default
   *  layout if not provided (e.g. before the config migration is applied). */
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
  // Local, addition-only copies of the server-provided lists so a category/
  // tag created inline (see addCategory/addTag below) shows up immediately
  // without a full page refetch — the canonical lists still live server-side.
  const [categoryList, setCategoryList] = useState(categories);
  const [tagList, setTagList] = useState(allTags);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [addingTag, setAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [tagSaving, setTagSaving] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<DraftAttachment[]>(() =>
    (initial?.attachments ?? []).map(toDraftAttachment),
  );
  const [sections, setSections] = useState<DraftSection[]>(() =>
    (initial?.sections ?? []).map(toDraftSection),
  );
  const [fieldConfig, setFieldConfigState] =
    useState<FieldConfigEntry[]>(initialFieldConfig);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(initial?.id);
  const fieldOrder = useMemo(
    () => enabledFieldOrder(fieldConfig),
    [fieldConfig],
  );
  const disabledBuiltIns = useMemo(
    () => fieldConfig.filter((f) => !f.enabled),
    [fieldConfig],
  );
  const tagsEnabled = fieldOrder.includes("tags");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const uploadingCount = useMemo(() => {
    const inSections = sections.reduce(
      (n, s) =>
        n + s.attachments.filter((a) => a.status === "uploading").length,
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

  // Plain handlers, not <form onSubmit>, on purpose — this widget is nested
  // inside the page's single outer issue <form>, and a nested <form> would
  // have its submit event bubble up and also trigger the outer submit.
  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError("Enter a category name.");
      return;
    }
    if (categoryList.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setCategoryError("That category already exists.");
      return;
    }
    setCategorySaving(true);
    setCategoryError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to add category");
      setCategoryList((prev) =>
        [...prev, data as { id: string; name: string }].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setCategoryId(data.id);
      setNewCategoryName("");
      setAddingCategory(false);
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setCategorySaving(false);
    }
  }

  async function addTag() {
    const name = newTagName.trim();
    if (!name) {
      setTagError("Enter a tag name.");
      return;
    }
    if (tagList.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setTagError("That tag already exists.");
      return;
    }
    setTagSaving(true);
    setTagError(null);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to add tag");
      const created = data as TagOption;
      setTagList((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTagIds((prev) => new Set(prev).add(created.id));
      setNewTagName("");
      setAddingTag(false);
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Failed to add tag");
    } finally {
      setTagSaving(false);
    }
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
    persistFieldConfig(
      reorderEnabledFields(
        fieldConfig,
        active.id as LayoutKey,
        over.id as LayoutKey,
      ),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tagsEnabled && selectedTagIds.size === 0) {
      setError("Please select at least one tag.");
      return;
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
          type: s.type,
          title: s.title,
          content: s.content,
          attachments: s.attachments
            .filter((a) => a.status === "ready" && a.storagePath)
            .map(toAttachmentPayload),
        })),
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
          {categoryList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {addingCategory ? (
          <div className="mt-2 flex flex-wrap items-start gap-1.5">
            <div className="flex-1">
              <input
                autoFocus
                className="input"
                placeholder="New category name"
                maxLength={80}
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  if (categoryError) setCategoryError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  } else if (e.key === "Escape") {
                    setAddingCategory(false);
                    setNewCategoryName("");
                    setCategoryError(null);
                  }
                }}
              />
              {categoryError && <p className="mt-1 text-xs text-red-700">{categoryError}</p>}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={categorySaving}
              onClick={() => addCategory()}
            >
              {categorySaving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setAddingCategory(false);
                setNewCategoryName("");
                setCategoryError(null);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <span>Can&apos;t find what you need?</span>
            <button
              type="button"
              onClick={() => setAddingCategory(true)}
              className="font-medium text-accent hover:underline"
            >
              <IconPlus size={11} className="mr-0.5 inline align-text-top" /> Add Category
            </button>
          </div>
        )}
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
        {tagList.length === 0 ? (
          <p className="text-sm text-slate-500">No tags yet — add one below.</p>
        ) : (
          <div className="flex max-h-[90px] flex-wrap gap-2 overflow-y-auto rounded-md border border-slate-200 p-3">
            {tagList.map((t) => {
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

        {addingTag ? (
          <div className="mt-2 flex flex-wrap items-start gap-1.5">
            <div className="flex-1">
              <input
                autoFocus
                className="input"
                placeholder="New tag name"
                maxLength={40}
                value={newTagName}
                onChange={(e) => {
                  setNewTagName(e.target.value);
                  if (tagError) setTagError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  } else if (e.key === "Escape") {
                    setAddingTag(false);
                    setNewTagName("");
                    setTagError(null);
                  }
                }}
              />
              {tagError && <p className="mt-1 text-xs text-red-700">{tagError}</p>}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={tagSaving}
              onClick={() => addTag()}
            >
              {tagSaving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setAddingTag(false);
                setNewTagName("");
                setTagError(null);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingTag(true)}
            className="mt-1.5 text-xs font-medium text-accent hover:underline"
          >
            <IconPlus size={11} className="mr-0.5 inline align-text-top" /> Add Tag
          </button>
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
    return fieldRenderers[key]?.();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Drag <IconGripVertical size={12} className="inline align-text-top" />{" "}
          to reorder fields — changes apply to every future issue too.
        </p>
        {layoutSaving && (
          <span className="text-xs text-slate-400">Saving layout…</span>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fieldOrder}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-5">
            {fieldOrder.map((key, i) => (
              <SortableFieldBlock
                key={key}
                fieldKey={key}
                label={FIELD_REGISTRY[key].label}
                requiredBadge={isRequiredField(key)}
                canMoveUp={i > 0}
                canMoveDown={i < fieldOrder.length - 1}
                onMoveUp={() =>
                  persistFieldConfig(moveEnabledField(fieldConfig, key, -1))
                }
                onMoveDown={() =>
                  persistFieldConfig(moveEnabledField(fieldConfig, key, 1))
                }
                onRemove={
                  isRequiredField(key)
                    ? null
                    : () =>
                        persistFieldConfig(
                          setFieldEnabled(fieldConfig, key, false),
                        )
                }
              >
                {renderField(key)}
              </SortableFieldBlock>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {disabledBuiltIns.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Add field:</span>
          {disabledBuiltIns.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() =>
                persistFieldConfig(setFieldEnabled(fieldConfig, f.key, true))
              }
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-50"
            >
              + {FIELD_REGISTRY[f.key].label}
            </button>
          ))}
        </div>
      )}

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
    </form>
  );
}
