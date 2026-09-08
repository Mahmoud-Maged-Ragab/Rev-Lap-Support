"use client";

import type { CustomFieldDef } from "@/lib/customFields";

/**
 * Renders the correct native input for a data-driven custom field
 * definition. Values are always kept/sent as plain strings (JSON-encoded
 * for multiselect) — see `validateCustomFieldValues` in lib/customFields.ts
 * for how each type is checked server-side.
 */
export function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = `custom-field-${field.id}`;

  if (field.type === "textarea") {
    return (
      <textarea
        id={inputId}
        className="textarea"
        required={field.required}
        placeholder={field.placeholder ?? undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        id={inputId}
        className="select"
        required={field.required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Select —</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "radio") {
    return (
      <div className="flex flex-wrap gap-3">
        {(field.options ?? []).map((opt) => (
          <label key={opt} className="flex items-center gap-1.5 text-sm text-ink-900">
            <input
              type="radio"
              name={inputId}
              required={field.required}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="h-4 w-4 border-slate-300"
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-ink-900">
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          className="h-4 w-4 rounded border-slate-300"
        />
        {field.placeholder || "Yes"}
      </label>
    );
  }

  if (field.type === "multiselect") {
    let selected: string[] = [];
    try {
      const parsed = JSON.parse(value || "[]");
      if (Array.isArray(parsed)) selected = parsed;
    } catch {
      selected = [];
    }
    function toggle(opt: string) {
      const next = selected.includes(opt)
        ? selected.filter((o) => o !== opt)
        : [...selected, opt];
      onChange(JSON.stringify(next));
    }
    return (
      <div className="flex flex-wrap gap-3">
        {(field.options ?? []).map((opt) => (
          <label key={opt} className="flex items-center gap-1.5 text-sm text-ink-900">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  const htmlType =
    field.type === "number"
      ? "number"
      : field.type === "date"
        ? "date"
        : field.type === "url"
          ? "url"
          : field.type === "email"
            ? "email"
            : field.type === "phone"
              ? "tel"
              : "text";

  return (
    <input
      id={inputId}
      type={htmlType}
      className="input"
      required={field.required}
      placeholder={field.placeholder ?? undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
