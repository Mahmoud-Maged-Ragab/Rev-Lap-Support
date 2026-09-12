import { getIssueBySlug, incrementViews } from "@/lib/issues";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { VideoPlayer } from "@/components/VideoPlayer";
import { SaveIssueButton } from "@/components/SaveIssueButton";
import { AttachmentGrid } from "@/components/attachments/AttachmentView";
import { IssueManageCard } from "@/components/IssueManageCard";
import { readSession } from "@/lib/auth";
import { canManageContent } from "@/lib/permissions";
import { isRichTextEmpty, renderRichTextHtml } from "@/lib/richText";
import type { IssueSection } from "@/lib/issues";

export const dynamic = "force-dynamic";

function fmt(d: Date | string, locale: string) {
  return new Date(d).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isSectionVisible(section: { title: string; content: string; attachments: unknown[] }): boolean {
  return !!section.title.trim() || !!section.content.trim() || section.attachments.length > 0;
}

/**
 * Renders one content element by its `type` — a "legacy" section (every
 * section saved before the Issue Builder's "Add Element" menu existed, or
 * still created through the section-level editor) keeps its original
 * numbered-heading + description + attachments layout; anything added as a
 * specific element type renders just the one thing it holds, un-numbered,
 * as a normal flowing content block.
 */
function SectionBody({
  section,
  legacyNumber,
  untitledLabel,
}: {
  section: IssueSection;
  legacyNumber: number | null;
  untitledLabel: string;
}) {
  switch (section.type) {
    case "headline":
      return <h2 className="text-2xl font-bold tracking-tight text-ink-900">{section.title}</h2>;
    case "subheadline":
      return <h3 className="text-lg font-semibold text-slate-700">{section.title}</h3>;
    case "paragraph":
      return (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
          {section.content}
        </p>
      );
    case "richtext":
      return isRichTextEmpty(section.content) ? null : (
        <div
          className="prose-kb space-y-3 text-[15px] leading-relaxed text-slate-700"
          dangerouslySetInnerHTML={{ __html: renderRichTextHtml(section.content) }}
        />
      );
    case "video":
    case "pdf":
    case "doc":
    case "image":
      return <AttachmentGrid attachments={section.attachments} />;
    default:
      // "legacy"
      return (
        <>
          <h2 className="text-base font-semibold text-ink-900">
            {legacyNumber}. {section.title || untitledLabel}
          </h2>
          {section.content && (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
              {section.content}
            </p>
          )}
          <AttachmentGrid attachments={section.attachments} />
        </>
      );
  }
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

  const t = await getTranslations("issueDetail");
  const locale = await getLocale();
  const session = await readSession();
  const canManage = !!session && canManageContent(session.role);

  const visibleSections = issue.sections.filter(isSectionVisible);

  return (
    <article className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[1fr_240px] lg:gap-8">
      <div className="min-w-0 space-y-6">
        <nav className="text-xs text-slate-500">
          <Link href="/" className="hover:text-ink-900">
            {t("allIssues")}
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
          {issue.subtitle && (
            <p className="text-sm text-slate-500">{issue.subtitle}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{t("created", { date: fmt(issue.createdAt, locale) })}</span>
            <span>·</span>
            <span>{t("updated", { date: fmt(issue.updatedAt, locale) })}</span>
            <span>·</span>
            <span>{t("views", { count: issue.views })}</span>
          </div>
        </header>

        <section className="prose-kb space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("problem")}
          </h2>
          <p className="whitespace-pre-wrap">{issue.description}</p>
        </section>

        {issue.errorMessage && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t("errorMessage")}
            </h2>
            <pre className="prose-kb-pre overflow-x-auto rounded-md bg-slate-900 px-4 py-3 text-sm leading-relaxed text-slate-100">
              {issue.errorMessage}
            </pre>
          </section>
        )}
        {issue.solution && (
          <section className="prose-kb space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t("solution")}
            </h2>
            <div className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-[15px] leading-relaxed">
              {issue.solution}
            </div>
          </section>
        )}

        {issue.attachments.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t("attachments")}
            </h2>
            <AttachmentGrid attachments={issue.attachments} />
          </section>
        )}

        {visibleSections.length > 0 && (
          <div className="space-y-6">
            {(() => {
              let legacyCount = 0;
              return visibleSections.map((section) => {
                const legacyNumber = section.type === "legacy" ? ++legacyCount : null;
                return (
                  <section
                    key={section.id}
                    className="space-y-2.5 border-t border-slate-200 pt-6 first:border-t-0 first:pt-0"
                  >
                    <SectionBody
                      section={section}
                      legacyNumber={legacyNumber}
                      untitledLabel={t("untitledSection")}
                    />
                  </section>
                );
              });
            })()}
          </div>
        )}

        {issue.videoUrl && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t("video")}
            </h2>
            <VideoPlayer url={issue.videoUrl} />
          </section>
        )}

        {issue.images.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t("attachments")}
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
                    📄 {t("viewPdf", { number: i + 1 })}
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-5 text-sm">
        <div className="rounded-md border border-slate-200 p-4">
          <SaveIssueButton issueId={issue.id} />
        </div>
        {canManage && <IssueManageCard issueId={issue.id} title={issue.title} />}
        <div className="rounded-md border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("category")}
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
              <span className="text-slate-500">{t("none")}</span>
            )}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("tags")}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {issue.tags.length === 0 && (
              <span className="text-slate-500">{t("none")}</span>
            )}
            {issue.tags.map((t) => (
              <Link
                key={t.id}
                href={`/?tags=${t.id}`}
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
