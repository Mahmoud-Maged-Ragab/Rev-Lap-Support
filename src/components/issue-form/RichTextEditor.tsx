"use client";

import { useRef, useState } from "react";
import {
  IconBold,
  IconH2,
  IconH3,
  IconItalic,
  IconLink,
  IconList,
  IconListNumbers,
  IconQuote,
  IconUnderline,
} from "@tabler/icons-react";
import { renderRichTextHtml } from "@/lib/richText";

type Selection = { start: number; end: number };

function applyWrap(value: string, sel: Selection, marker: string): { next: string; cursor: Selection } {
  const selected = value.slice(sel.start, sel.end) || "text";
  const next = value.slice(0, sel.start) + marker + selected + marker + value.slice(sel.end);
  return {
    next,
    cursor: { start: sel.start + marker.length, end: sel.start + marker.length + selected.length },
  };
}

function applyLinePrefix(
  value: string,
  sel: Selection,
  makePrefix: (lineIndex: number) => string,
): { next: string; cursor: Selection } {
  const lineStart = value.lastIndexOf("\n", sel.start - 1) + 1;
  const nextBreak = value.indexOf("\n", sel.end > sel.start ? sel.end - 1 : sel.end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const rebuilt = lines.map((line, i) => `${makePrefix(i)}${line}`).join("\n");
  const next = value.slice(0, lineStart) + rebuilt + value.slice(lineEnd);
  return { next, cursor: { start: lineStart, end: lineStart + rebuilt.length } };
}

/**
 * Toolbar-driven editor for the "Rich Text" content element. Writes the
 * app's own lightweight markdown syntax (see lib/richText.ts) into a plain
 * textarea rather than using `contentEditable`/`execCommand` — no
 * deprecated browser APIs, and nothing here can ever produce raw HTML, so
 * there's no sanitization step needed before it's safe to render publicly.
 */
export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  function run(transform: (value: string, sel: Selection) => { next: string; cursor: Selection }) {
    const el = ref.current;
    if (!el) return;
    const sel: Selection = { start: el.selectionStart, end: el.selectionEnd };
    const { next, cursor } = transform(value, sel);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor.start, cursor.end);
    });
  }

  function insertLink() {
    const el = ref.current;
    if (!el) return;
    const url = window.prompt("Link URL (https://…)");
    if (!url) return;
    const sel: Selection = { start: el.selectionStart, end: el.selectionEnd };
    const label = value.slice(sel.start, sel.end) || "link text";
    const token = `[${label}](${url.trim()})`;
    const next = value.slice(0, sel.start) + token + value.slice(sel.end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = sel.start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  const buttons: { label: string; icon: typeof IconBold; onClick: () => void }[] = [
    { label: "Bold", icon: IconBold, onClick: () => run((v, s) => applyWrap(v, s, "**")) },
    { label: "Italic", icon: IconItalic, onClick: () => run((v, s) => applyWrap(v, s, "*")) },
    { label: "Underline", icon: IconUnderline, onClick: () => run((v, s) => applyWrap(v, s, "__")) },
    {
      label: "Heading",
      icon: IconH2,
      onClick: () => run((v, s) => applyLinePrefix(v, s, () => "## ")),
    },
    {
      label: "Subheading",
      icon: IconH3,
      onClick: () => run((v, s) => applyLinePrefix(v, s, () => "### ")),
    },
    {
      label: "Bulleted list",
      icon: IconList,
      onClick: () => run((v, s) => applyLinePrefix(v, s, () => "- ")),
    },
    {
      label: "Numbered list",
      icon: IconListNumbers,
      onClick: () => run((v, s) => applyLinePrefix(v, s, (i) => `${i + 1}. `)),
    },
    { label: "Quote", icon: IconQuote, onClick: () => run((v, s) => applyLinePrefix(v, s, () => "> ")) },
    { label: "Link", icon: IconLink, onClick: insertLink },
  ];

  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 p-1.5">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.onClick}
            aria-label={b.label}
            title={b.label}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200"
          >
            <b.icon size={15} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className={
            "ml-auto rounded px-2 py-1 text-xs font-medium " +
            (showPreview ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200")
          }
        >
          Preview
        </button>
      </div>

      {showPreview ? (
        <div
          className="prose-kb min-h-[110px] space-y-2 p-3 text-sm"
          dangerouslySetInnerHTML={{ __html: renderRichTextHtml(value) || "<p class=\"text-slate-400\">Nothing to preview yet.</p>" }}
        />
      ) : (
        <textarea
          ref={ref}
          className="block min-h-[110px] w-full resize-y border-0 p-3 text-sm focus:outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write here — use the toolbar above to format, or type **bold**, *italic*, ## heading, - list, > quote, [link](url)."
          maxLength={10000}
        />
      )}
    </div>
  );
}
