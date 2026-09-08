"use client";

import { useEffect, useState } from "react";
import { IconGripVertical, IconPlus, IconX } from "@tabler/icons-react";
import { CustomFieldTypeSchema, type CustomFieldType } from "@/lib/validation";
import type { CustomFieldDef } from "@/lib/customFields";

const TYPE_LABELS: Record<string, string> = {
  text: "Short text",
  textarea: "Long text",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  checkbox: "Checkbox",
  radio: "Radio (choose one)",
  url: "URL",
  email: "Email",
  phone: "Phone",
  multiselect: "Multi-select",
};

const OPTION_TYPES = new Set(["select", "radio", "multiselect"]);

function slugify(label: string): string {
  const s = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[^a-z]+/, "");
  return s || "field";
}

export function CustomFieldModal({
  initial,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial?: CustomFieldDef;
  onClose: () => void;
  onSaved: (field: CustomFieldDef) => void;
  /** Only relevant when editing (`initial` set) — permanently archives the
   *  field (soft delete; see lib/customFields.ts) and removes it from the
   *  form layout. Historical values on existing issues are kept. */
  onDeleted?: (fieldId: string) => void;
}) {
  const isEdit = !!initial;
  const [deleting, setDeleting] = useState(false);
  const [label, setLabel] = useState(initial?.label ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [nameEdited, setNameEdited] = useState(isEdit);
  const [type, setType] = useState<CustomFieldType>(initial?.type ?? "text");
  const [required, setRequired] = useState(initial?.required ?? false);
  const [placeholder, setPlaceholder] = useState(initial?.placeholder ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [options, setOptions] = useState<string[]>(initial?.options ?? []);
  const [newOption, setNewOption] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nameEdited) setName(slugify(label));
  }, [label, nameEdited]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function addOption() {
    const v = newOption.trim();
    if (!v || options.includes(v)) return;
    setOptions((prev) => [...prev, v]);
    setNewOption("");
  }

  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveOption(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= options.length) return;
    setOptions((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleDelete() {
    if (!initial || !onDeleted) return;
    if (
      !confirm(
        `Remove "${initial.label}" from the form? It will disappear from new issues, but any existing issue that already has a value keeps it.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/custom-fields/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to remove field");
      }
      onDeleted(initial.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove field");
      setDeleting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (OPTION_TYPES.has(type) && options.length === 0) {
      setError("Add at least one option for this field type.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        label,
        type,
        required,
        placeholder: placeholder.trim() || null,
        description: description.trim() || null,
        options: OPTION_TYPES.has(type) ? options : null,
      };
      const url = isEdit ? `/api/custom-fields/${initial!.id}` : "/api/custom-fields";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save field");
      onSaved(data.field);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save field");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/60 p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Edit custom field" : "Add custom field"}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[85vh] sm:max-w-md sm:rounded-lg sm:border sm:border-slate-200 sm:shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink-900">
            {isEdit ? "Edit custom field" : "Add custom field"}
          </h2>
          <button type="button" onClick={onClose} className="btn btn-outline btn-sm" aria-label="Close">
            <IconX size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <label className="label" htmlFor="cf-label">
              Field name
            </label>
            <input
              id="cf-label"
              className="input"
              required
              maxLength={100}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Order Number"
            />
            <p className="mt-1 text-xs text-slate-400">
              Stored as <code>{name || "field"}</code>{" "}
              {!isEdit && (
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() => setNameEdited(true)}
                >
                  (edit)
                </button>
              )}
            </p>
            {nameEdited && !isEdit && (
              <input
                className="input mt-1.5 !text-xs"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase())}
                pattern="[a-z][a-z0-9_]*"
                maxLength={60}
              />
            )}
          </div>

          <div>
            <label className="label" htmlFor="cf-type">
              Field type
            </label>
            <select
              id="cf-type"
              className="select"
              value={type}
              onChange={(e) => setType(e.target.value as CustomFieldType)}
            >
              {CustomFieldTypeSchema.options.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="label">Required</span>
            <div className="inline-flex overflow-hidden rounded-md border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setRequired(false)}
                className={"px-3 py-1.5 " + (!required ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50")}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setRequired(true)}
                className={"px-3 py-1.5 " + (required ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50")}
              >
                Yes
              </button>
            </div>
          </div>

          {OPTION_TYPES.has(type) && (
            <div>
              <span className="label">Options</span>
              <div className="space-y-1.5">
                {options.map((opt, i) => (
                  <div key={`${opt}-${i}`} className="flex items-center gap-1.5">
                    <IconGripVertical size={14} className="shrink-0 text-slate-300" />
                    <span className="min-w-0 flex-1 truncate rounded-md border border-slate-200 px-2.5 py-1 text-sm">
                      {opt}
                    </span>
                    <button type="button" onClick={() => moveOption(i, -1)} disabled={i === 0} className="btn btn-outline btn-sm !w-7 !px-0 disabled:opacity-30">
                      ↑
                    </button>
                    <button type="button" onClick={() => moveOption(i, 1)} disabled={i === options.length - 1} className="btn btn-outline btn-sm !w-7 !px-0 disabled:opacity-30">
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove option ${opt}`}
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <input
                    className="input !h-8 flex-1 !text-xs"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                    placeholder="Add an option…"
                    maxLength={100}
                  />
                  <button type="button" onClick={addOption} className="btn btn-outline btn-sm">
                    <IconPlus size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="label" htmlFor="cf-placeholder">
              Placeholder
            </label>
            <input
              id="cf-placeholder"
              className="input"
              maxLength={200}
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="Enter the customer's order…"
            />
          </div>

          <div>
            <label className="label" htmlFor="cf-description">
              Description / help text
            </label>
            <input
              id="cf-description"
              className="input"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional explanation…"
            />
          </div>

          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3">
          <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
            {saving ? "Saving…" : isEdit ? "Save field" : "Add field"}
          </button>
          <button type="button" onClick={onClose} className="btn">
            Cancel
          </button>
          {isEdit && onDeleted && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleting}
              className="ml-auto text-sm text-red-700 hover:underline"
            >
              {deleting ? "Removing…" : "Delete field"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
