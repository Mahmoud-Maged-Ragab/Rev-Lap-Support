"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { IconLayoutSidebarRightExpand } from "@tabler/icons-react";
import { AddElementMenu, paletteTypeFromId } from "./AddElementMenu";
import { SectionEditor } from "./SectionEditor";
import { newElementSection, type DraftSection } from "./types";
import { getSectionElementDef, type SectionElementType } from "@/lib/sectionElements";

const CANVAS_END_ID = "canvas-end";

/** Drop target for "insert at the end" — also doubles as the empty-canvas
 *  placeholder (`variant="empty"`) so an empty builder is droppable too,
 *  not just a static message. Highlights while a palette drag hovers it. */
function CanvasEndZone({ active, variant = "trailing" }: { active: boolean; variant?: "empty" | "trailing" }) {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_END_ID });
  const highlighted = active && isOver;

  if (variant === "empty") {
    return (
      <div
        ref={setNodeRef}
        className={
          "card flex flex-col items-center justify-center gap-2 border-dashed py-8 text-center transition-colors " +
          (highlighted ? "border-accent bg-accent/5" : "")
        }
      >
        <p className="text-sm text-slate-500">
          {active
            ? "Drop to add this element"
            : "No elements yet. For a quick issue, the description above is enough — drag or click an element from the panel to build out a detailed walkthrough."}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={
        "rounded-md transition-all " + (highlighted ? "h-12 border-2 border-dashed border-accent bg-accent/5" : "h-4")
      }
    />
  );
}

function InsertionLine() {
  return <div className="my-1 h-1 rounded-full bg-accent" />;
}

export function SectionsList({
  sections,
  onChange,
}: {
  sections: DraftSection[];
  onChange: (next: DraftSection[]) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingPaletteType, setDraggingPaletteType] = useState<SectionElementType | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function insertAt(index: number, type: SectionElementType) {
    const created = newElementSection(type);
    const next = [...sections];
    next.splice(index, 0, created);
    onChange(next);
    setSelectedId(created.clientId);
  }

  /** Click-to-add (also the touch-friendly path): lands right after the
   *  selected element, or at the end if nothing is selected. */
  function addElement(type: SectionElementType) {
    const selectedIndex = sections.findIndex((s) => s.clientId === selectedId);
    insertAt(selectedIndex >= 0 ? selectedIndex + 1 : sections.length, type);
    setMenuOpen(false);
  }

  function updateAt(i: number, patch: Partial<DraftSection>) {
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeAt(i: number) {
    if (sections[i]?.clientId === selectedId) setSelectedId(null);
    onChange(sections.filter((_, idx) => idx !== i));
  }

  function duplicateAt(i: number) {
    const source = sections[i];
    if (!source) return;
    // Media elements duplicate as a fresh empty block of the same type
    // rather than re-referencing the source's uploaded file(s) — two
    // attachment rows sharing one storagePath would make removing either
    // copy delete the file out from under the other. Text-based elements
    // (headline/subheadline/paragraph/richtext) have no such hazard, so
    // those clone their content in full.
    const clone: DraftSection = {
      ...newElementSection(source.type as SectionElementType),
      title: source.title,
      content: source.content,
    };
    const next = [...sections];
    next.splice(i + 1, 0, clone);
    onChange(next);
    setSelectedId(clone.clientId);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  function computeOverIndex(over: DragOverEvent["over"], activeRect: DragOverEvent["active"]["rect"]["current"]["translated"]) {
    if (!over) return null;
    if (over.id === CANVAS_END_ID) return sections.length;
    const idx = sections.findIndex((s) => s.clientId === over.id);
    if (idx < 0) return null;
    const overRect = over.rect;
    const isAfter = activeRect ? activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2 : false;
    return isAfter ? idx + 1 : idx;
  }

  function handleDragStart(event: DragStartEvent) {
    const paletteType = paletteTypeFromId(event.active.id);
    setDraggingPaletteType(paletteType);
  }

  function handleDragOver(event: DragOverEvent) {
    if (!draggingPaletteType) return;
    setOverIndex(computeOverIndex(event.over, event.active.rect.current.translated));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const paletteType = paletteTypeFromId(active.id);
    setDraggingPaletteType(null);

    if (paletteType) {
      // `overIndex` is only ever non-null when the pointer is actually over
      // a real canvas position (an element row or the end-of-list zone) —
      // dropped anywhere else (back over the panel, empty page space), it's
      // null and the drag is simply cancelled, not appended as a fallback.
      const index = overIndex;
      setOverIndex(null);
      if (index !== null) insertAt(index, paletteType);
      return;
    }
    setOverIndex(null);

    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.clientId === active.id);
    const to = sections.findIndex((s) => s.clientId === over.id);
    if (from < 0 || to < 0) return;
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  const paletteDef = draggingPaletteType ? getSectionElementDef(draggingPaletteType) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="label !mb-0">Content elements (optional)</span>
        <span className="text-xs text-slate-500">
          Break a detailed issue into headings, text, and media.
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setDraggingPaletteType(null);
          setOverIndex(null);
        }}
      >
        {sections.length === 0 ? (
          <CanvasEndZone active={!!draggingPaletteType} variant="empty" />
        ) : (
          <SortableContext
            items={sections.map((s) => s.clientId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {sections.map((s, i) => (
                <div key={s.clientId}>
                  {draggingPaletteType && overIndex === i && <InsertionLine />}
                  <div className="py-1.5">
                    <SectionEditor
                      section={s}
                      index={i}
                      total={sections.length}
                      selected={s.clientId === selectedId}
                      onSelect={() => setSelectedId(s.clientId)}
                      onChange={(patch) => updateAt(i, patch)}
                      onRemove={() => removeAt(i)}
                      onDuplicate={() => duplicateAt(i)}
                      onMoveUp={() => move(i, -1)}
                      onMoveDown={() => move(i, 1)}
                    />
                  </div>
                </div>
              ))}
              {draggingPaletteType && overIndex === sections.length && <InsertionLine />}
              <CanvasEndZone active={!!draggingPaletteType} />
            </div>
          </SortableContext>
        )}

        <AddElementMenu open={menuOpen} onClose={() => setMenuOpen(false)} onSelect={addElement} />

        <DragOverlay>
          {paletteDef && (
            <div className="flex items-center gap-2 rounded-md border border-accent bg-white px-3 py-2 text-sm font-medium text-ink-900 shadow-lg">
              <paletteDef.icon size={16} className="text-accent" />
              {paletteDef.label}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <button
        type="button"
        className="btn btn-outline"
        onClick={() => setMenuOpen(true)}
      >
        <IconLayoutSidebarRightExpand size={16} className="mr-1.5" /> Elements
      </button>
    </div>
  );
}
