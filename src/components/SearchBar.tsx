"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
//import { IconSearch } from "@tabler/icons-react";

export function SearchBar({ size = "lg" }: { size?: "lg" | "sm" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    next.delete("page");
    router.push(`/?${next.toString()}`);
  }

  return (
    <form onSubmit={submit} role="search" className="w-full">
      <div className="relative">
        <div className="relative w-full">
          {/* <IconSearch
            stroke={2}
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          /> */}

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search issues, error messages, tags, categories…"
            className={`w-full rounded-md border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 ${
              size === "lg" ? "h-12 text-[15px]" : "h-9"
            }`}
            aria-label="Search the knowledge base"
          />
        </div>
        <kbd className="kbd absolute right-3 top-1/2 hidden -translate-y-1/2 sm:inline-block">
          Enter
        </kbd>
      </div>
    </form>
  );
}
