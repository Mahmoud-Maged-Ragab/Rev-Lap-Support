import { getIssueBySlug, incrementViews } from "@/lib/issues";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VideoPlayer } from "@/components/VideoPlayer";

export const dynamic = "force-dynamic";

function fmt(d: Date | string) {
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isGoogleDrivePdfUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "drive.google.com") return false;
    if (u.pathname.startsWith("/file/d/")) return true;
    return u.pathname === "/open" || u.pathname === "/uc";
  } catch {
    return false;
  }
}

function getGoogleDrivePreviewUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.replace(/^www\./, "") !== "drive.google.com") return url;
    if (u.pathname.startsWith("/file/d/")) {
      const parts = u.pathname.split("/");
      const id = parts[3];
      return id ? `https://drive.google.com/file/d/${id}/preview` : url;
    }
    const id = u.searchParams.get("id");
    return id ? `https://drive.google.com/file/d/${id}/preview` : url;
  } catch {
    return url;
  }
}

function isPdfUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const pathname = u.pathname.toLowerCase();
    if (pathname.endsWith(".pdf")) return true;
    return isGoogleDrivePdfUrl(url);
  } catch {
    return false;
  }
}

export default async function IssuePage({
  params,
}: {
  params: { slug: string };
}) {
  const issue = await getIssueBySlug(params.slug);
  if (!issue) notFound();

  // Fire-and-forget view increment (don't await failures)
  incrementViews(issue.id).catch(() => {});

  return (
    <article className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_240px]">
      <div className="min-w-0 space-y-6">
        <nav className="text-xs text-slate-500">
          <Link href="/" className="hover:text-ink-900">
            All issues
          </Link>
          {issue.category && (
            <>
              <span className="mx-1.5">/</span>
              <Link
                href={`/?category=${issue.category.id}`}
                className="hover:text-ink-900"
              >
                {issue.category.name}
              </Link>
            </>
          )}
        </nav>

        <header className="space-y-2 border-b border-slate-200 pb-5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {issue.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Created {fmt(issue.createdAt)}</span>
            <span>·</span>
            <span>Updated {fmt(issue.updatedAt)}</span>
            <span>·</span>
            <span>{issue.views.toLocaleString()} views</span>
          </div>
        </header>

        <section className="prose-kb space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Problem
          </h2>
          <p className="whitespace-pre-wrap">{issue.description}</p>
        </section>

        {issue.errorMessage && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Error message
            </h2>
            <pre className="prose-kb-pre overflow-x-auto rounded-md bg-slate-900 px-4 py-3 text-sm leading-relaxed text-slate-100">
              {issue.errorMessage}
            </pre>
          </section>
        )}
        <section className="prose-kb space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Solution
          </h2>
          <div className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-[15px] leading-relaxed">
            {issue.solution}
          </div>
        </section>

        {issue.videoUrl && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Video demonstration
            </h2>
            <VideoPlayer url={issue.videoUrl} />
          </section>
        )}

        {issue.images.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Attachments
            </h2>
            <div className="space-y-2">
              {issue.images.map((src, i) => {
                const previewUrl = isGoogleDrivePdfUrl(src)
                  ? getGoogleDrivePreviewUrl(src)
                  : src;
                return (
                  <a
                    key={i}
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md border border-slate-200 p-3 text-sm text-blue-600 hover:bg-slate-50 hover:underline"
                  >
                    📄 View PDF {i + 1}
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-5 text-sm">
        <div className="rounded-md border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Category
          </div>
          <div className="mt-1.5">
            {issue.category ? (
              <Link
                href={`/?category=${issue.category.id}`}
                className="text-ink-900 hover:underline"
              >
                {issue.category.name}
              </Link>
            ) : (
              <span className="text-slate-500">—</span>
            )}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tags
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {issue.tags.length === 0 && (
              <span className="text-slate-500">—</span>
            )}
            {issue.tags.map((t) => (
              <Link
                key={t.id}
                href={`/?tag=${t.id}`}
                className="chip hover:bg-slate-200"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </article>
  );
}
