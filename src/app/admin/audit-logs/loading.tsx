export default function LoadingAuditLogs() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="space-y-2">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 w-32 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse border-b border-slate-100 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
