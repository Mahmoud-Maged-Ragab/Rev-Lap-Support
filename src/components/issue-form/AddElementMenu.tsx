"use client";

import { useEffect, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { IconX } from "@tabler/icons-react";
import { SECTION_ELEMENTS, type SectionElementType } from "@/lib/sectionElements";

export const PALETTE_ID_PREFIX = "palette:";

export function paletteTypeFromId(id: string | number): SectionElementType | null {
  const s = String(id);
  if (!s.startsWith(PALETTE_ID_PREFIX)) return null;
  const type = s.slice(PALETTE_ID_PREFIX.length);
  return SECTION_ELEMENTS.some((e) => e.type === type) ? (type as SectionElementType) : null;
}

/** One draggable + clickable row in the Elements panel. Small pointer moves
 *  still register as a click (see the shared sensors' activationConstraint
 *  in SectionsList.tsx) so both interactions coexist on the same element —
 *  this is the same disambiguation already used for the field builder. */
function ElementRow({
  type,
  label,
  description,
  icon: Icon,
  onSelect,
}: {
  type: SectionElementType;
  label: string;
  description: string;
  icon: (typeof SECTION_ELEMENTS)[number]["icon"];
  onSelect: (type: SectionElementType) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PALETTE_ID_PREFIX}${type}`,
    data: { source: "palette", elementType: type },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onSelect(type)}
      className={
        "flex w-full touch-none items-center gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100" +
        (isDragging ? " opacity-40" : "")
      }
      {...attributes}
      {...listeners}
    >
      <span className="flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-lg bg-slate-100 text-slate-600 active:cursor-grabbing">
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-900">{label}</span>
        <span className="block truncate text-xs text-slate-500">{description}</span>
      </span>
    </button>
  );
}

/**
 * Right-side slide-out panel (full-width on mobile) listing every content
 * element Support/Admin can add to the Issue Builder. Each row is BOTH
 * draggable (drop it directly into the canvas at any position — see
 * SectionsList.tsx, which owns the shared DndContext this panel's rows
 * plug into) and clickable (`onSelect` — adds it at the selected/current
 * position and closes the panel, the mobile-friendly path).
 */
export function AddElementMenu({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (type: SectionElementType) => void;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Elements"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          "flex h-full w-full flex-col overflow-hidden bg-white shadow-xl transition-transform duration-200 ease-out sm:w-[380px] sm:border-l sm:border-slate-200 " +
          (entered ? "translate-x-0" : "translate-x-full")
        }
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">Elements</h2>
            <p className="text-xs text-slate-500">Drag onto the builder, or click to add.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline btn-sm"
            aria-label="Close"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {SECTION_ELEMENTS.map((el) => (
            <ElementRow
              key={el.type}
              type={el.type}
              label={el.label}
              description={el.description}
              icon={el.icon}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
