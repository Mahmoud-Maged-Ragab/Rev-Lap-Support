"use client";

import { useState, useEffect } from "react";
import { saveIssue, unsaveIssue, isIssueSaved } from "@/lib/saved-issues";

export function SaveIssueButton({
  issueId,
  variant = "default",
}: {
  issueId: string;
  variant?: "default" | "compact";
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsSaved(isIssueSaved(issueId));
  }, [issueId]);

  const handleToggle = () => {
    if (isSaved) {
      unsaveIssue(issueId);
      setIsSaved(false);
    } else {
      saveIssue(issueId);
      setIsSaved(true);
    }
  };

  // Avoid hydration mismatch
  if (!mounted) {
    return variant === "compact" ? (
      <button className="btn btn-sm" disabled>
        Save
      </button>
    ) : (
      <button className="btn" disabled>
        Save Issue
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        onClick={handleToggle}
        className={isSaved ? "btn btn-sm" : "btn btn-sm btn-primary"}
        title={isSaved ? "Remove from saved" : "Save issue"}
      >
        {isSaved ? "✓ Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={
        isSaved
          ? "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          : "rounded-md border border-transparent bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
      }
    >
      {isSaved ? "✓ Saved" : "Save Issue"}
    </button>
  );
}
