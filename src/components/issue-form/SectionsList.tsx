"use client";

import { IconPlus } from "@tabler/icons-react";
import { SectionEditor } from "./SectionEditor";
import { newSectionClientId, type DraftSection } from "./types";

export function SectionsList({
  sections,
  onChange,
}: {
  sections: DraftSection[];
  onChange: (next: DraftSection[]) => void;
}) {
  function addSection() {
    onChange([
      ...sections,
      { clientId: newSectionClientId(), title: "", content: "", attachments: [] },
    ]);
  }

  function updateAt(i: number, patch: Partial<DraftSection>) {
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeAt(i: number) {
    onChange(sections.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="label !mb-0">Sections (optional)</span>
        <span className="text-xs text-slate-500">
          Break a detailed issue into organized parts.
        </span>
      </div>

      {sections.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 border-dashed py-8 text-center">
          <p className="text-sm text-slate-500">
            No sections yet. For a quick issue, the description above is
            enough — add sections only if you want to organize a detailed
            walkthrough into parts.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((s, i) => (
            <SectionEditor
              key={s.clientId}
              section={s}
              index={i}
              total={sections.length}
              onChange={(patch) => updateAt(i, patch)}
              onRemove={() => removeAt(i)}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
            />
          ))}
        </div>
      )}

      <button type="button" className="btn btn-outline" onClick={addSection}>
        <IconPlus size={16} className="mr-1.5" /> Add section
      </button>
    </div>
  );
}
