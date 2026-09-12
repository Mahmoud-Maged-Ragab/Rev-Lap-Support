"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconCheck, IconChevronDown, IconSearch, IconX } from "@tabler/icons-react";

export type MultiSelectOption = { id: string; label: string };

/**
 * Generic searchable multi-select popover — the reusable dropdown/popover
 * component for this app (none existed before; no dropdown/combobox library
 * is installed, so this is built on plain React state + a document-click
 * listener rather than pulling in Radix/Headless UI for one widget).
 *
 * All filtering happens client-side against `options`, which the caller
 * loads once (e.g. from a server component prop) — typing in the search box
 * never triggers a network request, no matter how many options there are.
 * Selected options are shown as removable chips both inside the closed
 * trigger and in the open list (checkmarked), so a tag can be removed
 * without reopening the popover.
 */
export function MultiSelectDropdown({
  options,
  selectedIds,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  disabled = false,
}: {
  options: MultiSelectOption[];
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const selected = useMemo(
    () => Array.from(selectedIds).map((id) => byId.get(id)).filter((o): o is MultiSelectOption => !!o),
    [selectedIds, byId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
    setQuery("");
  }, [open]);

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function remove(id: string, e?: React.SyntheticEvent) {
    e?.stopPropagation();
    const next = new Set(selectedIds);
    next.delete(id);
    onChange(next);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={
          "flex min-h-[2.5rem] w-full flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-sm shadow-sm transition " +
          (disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-slate-300 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30")
        }
      >
        {selected.length === 0 ? (
          <span className="text-slate-400">{placeholder}</span>
        ) : (
          selected.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-accent"
            >
              <span className="max-w-[10rem] truncate">{o.label}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => remove(o.id, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    remove(o.id, e);
                  }
                }}
                aria-label={`Remove ${o.label}`}
                className="rounded-full p-0.5 hover:bg-accent/20"
              >
                <IconX size={11} />
              </span>
            </span>
          ))
        )}
        <IconChevronDown size={14} className="ml-auto shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <IconSearch
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="input !h-8 !pl-7 !text-xs"
              />
            </div>
          </div>
          <div
            role="listbox"
            aria-multiselectable="true"
            className="max-h-56 overflow-y-auto overscroll-contain p-1"
          >
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-slate-500">{emptyText}</p>
            ) : (
              filtered.map((o) => {
                const active = selectedIds.has(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => toggle(o.id)}
                    className={
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm " +
                      (active ? "bg-accent/10 text-accent" : "text-slate-700 hover:bg-slate-50")
                    }
                  >
                    <span
                      className={
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
                        (active ? "border-accent bg-accent text-white" : "border-slate-300")
                      }
                    >
                      {active && <IconCheck size={11} />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
