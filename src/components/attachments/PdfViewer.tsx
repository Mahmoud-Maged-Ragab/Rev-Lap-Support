"use client";

import { useEffect, useRef, useState } from "react";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

/**
 * In-app PDF viewer: renders every page to a <canvas> via pdfjs-dist inside
 * a scrollable container. Deliberately never opens the raw PDF url in a new
 * tab / iframe — parsing and painting both happen inside this component.
 *
 * pdfjs-dist touches browser-only globals (Canvas, DOMMatrix, …), so it's
 * imported dynamically inside an effect rather than at module scope — this
 * component only ever runs client-side, but the surrounding page can still
 * be server-rendered without pdfjs executing during that pass.
 */
export function PdfViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const baseScaleRef = useRef(1);

  // Load the document once per url.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setErrorMsg(null);
    setZoom(1);
    docRef.current = null;

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.js",
          import.meta.url,
        ).toString();
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) {
          pdf.destroy();
          return;
        }
        docRef.current = pdf;
        setNumPages(pdf.numPages);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Failed to load PDF");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      docRef.current?.destroy?.();
    };
  }, [url]);

  // Render every page at the current zoom level.
  useEffect(() => {
    const container = containerRef.current;
    const pdf = docRef.current;
    if (status !== "ready" || !pdf || !container) return;

    let cancelled = false;
    const renderTasks: RenderTask[] = [];
    container.innerHTML = "";

    (async () => {
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (cancelled) return;
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        if (pageNum === 1) {
          // Fit the first page to the container's width; every subsequent
          // page (and future zoom changes) scales from that same baseline.
          const natural = page.getViewport({ scale: 1 });
          const width = container.clientWidth || natural.width;
          baseScaleRef.current = Math.min(2, width / natural.width);
        }

        const viewport = page.getViewport({ scale: baseScaleRef.current * zoom });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = "mx-auto block bg-white shadow-sm";
        canvas.style.marginBottom = "12px";
        container.appendChild(canvas);

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        const task = page.render({ canvasContext: ctx, viewport });
        renderTasks.push(task);
        try {
          await task.promise;
        } catch {
          // Cancelled mid-render (zoom/url changed) — expected, ignore.
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTasks.forEach((t) => t.cancel?.());
    };
  }, [status, zoom]);

  return (
    <div className="flex h-full min-h-[50vh] flex-col">
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-6"
      >
        {status === "loading" && (
          <p className="py-10 text-center text-sm text-slate-500">Loading PDF…</p>
        )}
        {status === "error" && (
          <p className="py-10 text-center text-sm text-red-700">{errorMsg}</p>
        )}
      </div>
      {status === "ready" && (
        <div className="flex shrink-0 items-center justify-center gap-3 border-t border-slate-200 bg-white px-4 py-2 text-sm">
          <button
            type="button"
            className="btn btn-outline btn-sm !w-8 !px-0"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))}
            aria-label="Zoom out"
          >
            <IconMinus size={14} />
          </button>
          <span className="w-12 text-center tabular-nums text-slate-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm !w-8 !px-0"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))}
            aria-label="Zoom in"
          >
            <IconPlus size={14} />
          </button>
          <span className="ml-2 text-xs text-slate-400">
            {numPages} page{numPages === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  );
}
