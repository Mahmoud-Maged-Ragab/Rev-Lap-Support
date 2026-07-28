"use client";

import { useState, useEffect } from "react";
import { getSavedIssueIds } from "@/lib/saved-issues";
import Link from "next/link";
import type { IssueListItem } from "@/lib/issues";
import { SaveIssueButton } from "@/components/SaveIssueButton";

function fmt(d: Date, locale: string) {
  return new Date(d).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SavedIssuesList({ locale }: { locale: string }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [issues, setIssues] = useState<IssueListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const ids = getSavedIssueIds();
    setSavedIds(ids);

    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch issue details from the API
    fetch(`/api/issues?ids=${ids.join(",")}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setIssues(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Update list when an issue is unsaved
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const currentIds = getSavedIssueIds();
      if (JSON.stringify(currentIds) !== JSON.stringify(savedIds)) {
        setSavedIds(currentIds);
        setIssues((prev) => prev.filter((i) => currentIds.includes(i.id)));
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [savedIds]);

  if (!mounted || loading) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  if (savedIds.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-500">You haven't saved any issues yet.</p>
        <Link href="/" className="btn btn-primary mt-4 inline-block">
          Browse Issues
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
      {issues.map((i) => (
        <li key={i.id} className="p-4 transition-colors hover:bg-slate-50">
          <div className="flex items-start justify-between gap-4">
            <Link href={`/issues/${i.slug}`} className="block min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold text-ink-900">
                    {i.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {i.description}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    {i.category && <span className="chip">{i.category.name}</span>}
                    {i.tags.slice(0, 4).map((t) => (
                      <span key={t.id} className="chip">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-end text-xs text-slate-500">
                  <span>{fmt(i.updatedAt, locale)}</span>
                </div>
              </div>
            </Link>
            <div className="shrink-0">
              <SaveIssueButton issueId={i.id} variant="compact" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
