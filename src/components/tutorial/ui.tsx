/**
 * Presentation primitives for the /tutorial system guide.
 *
 * Deliberately built from the same vocabulary as the rest of the app —
 * `rounded-md border border-slate-200 bg-white`, the slate/ink palette, the
 * `.chip` / `.btn` / `.table` component classes from globals.css — so the guide
 * reads as a native part of the product rather than a bolted-on doc site.
 *
 * Everything here is pure presentation (no data access, no server-only APIs) so
 * it can be rendered from the client shell in TutorialGuide.tsx.
 *
 * Layout uses logical properties (start/end, ps/pe, ms/me, border-s/border-e)
 * and `rtl:` variants so the guide mirrors correctly in Arabic, like the rest of
 * the application.
 */

import type { ReactNode } from "react";
import type { Role } from "@/lib/permissions";

// ---------------------------------------------------------------------------
// Icons — small inline SVGs (24×24, stroke-based) so the guide gets iconography
// without pulling a new icon runtime into the bundle.
// ---------------------------------------------------------------------------

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "h-4 w-4"}
    >
      {children}
    </svg>
  );
}

export const Icons = {
  rocket: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 13a8 8 0 0 1 7-7l6-2-2 6a8 8 0 0 1-7 7l-2-2Z" />
      <path d="M9 15l-3 3" />
      <circle cx="14.5" cy="9.5" r="1.2" />
    </Svg>
  ),
  book: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z" />
      <path d="M6 19h12v2H6" />
    </Svg>
  ),
  shield: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  ),
  users: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5" />
      <path d="M17.5 14A5.5 5.5 0 0 1 21 19" />
    </Svg>
  ),
  grid: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11M15 9v11" />
    </Svg>
  ),
  flow: (p: IconProps) => (
    <Svg {...p}>
      <rect x="4" y="3" width="16" height="4" rx="1" />
      <rect x="4" y="17" width="16" height="4" rx="1" />
      <path d="M12 7v4m0 0h5v6m-5-6H7v6" />
    </Svg>
  ),
  file: (p: IconProps) => (
    <Svg {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Svg>
  ),
  tag: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 11V5a2 2 0 0 1 2-2h6l10 10-8 8L3 11Z" />
      <circle cx="8" cy="8" r="1.2" />
    </Svg>
  ),
  chart: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </Svg>
  ),
  history: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3 4v4h4" />
      <path d="M12 8v4l3 2" />
    </Svg>
  ),
  userCog: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 9-5.2" />
      <circle cx="17.5" cy="17.5" r="2.5" />
      <path d="M17.5 13.5v1.2M17.5 20.3v1.2M21 17.5h-1.2M15.2 17.5H14" />
    </Svg>
  ),
  globe: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 2.5 15 0 18M12 3c-2.5 2.6-2.5 15 0 18" />
    </Svg>
  ),
  checklist: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 6l2 2 3-3M4 14l2 2 3-3" />
      <path d="M13 7h7M13 15h7" />
    </Svg>
  ),
  help: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3" />
      <path d="M12 17h.01" />
    </Svg>
  ),
  info: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </Svg>
  ),
  bulb: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 17h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.3.3.5.7.5 1.1h6c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3Z" />
    </Svg>
  ),
  warning: (p: IconProps) => (
    <Svg {...p}>
      <path d="M10.3 4.3 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 17h.01" />
    </Svg>
  ),
  alert: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16h.01" />
    </Svg>
  ),
  check: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4.5 12.5 9 17l10.5-10.5" />
    </Svg>
  ),
  cross: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  ),
  dash: (p: IconProps) => (
    <Svg {...p}>
      <path d="M5 12h14" />
    </Svg>
  ),
  search: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Svg>
  ),
  chevronDown: (p: IconProps) => (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  ),
  chevronRight: (p: IconProps) => (
    <Svg {...p}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  ),
  lock: (p: IconProps) => (
    <Svg {...p}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Svg>
  ),
  star: (p: IconProps) => (
    <Svg {...p}>
      <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8L12 4Z" />
    </Svg>
  ),
};

export type IconName = keyof typeof Icons;

// ---------------------------------------------------------------------------
// Text + layout blocks
// ---------------------------------------------------------------------------

/** Short lead paragraph under a section heading. */
export function Lead({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-slate-600">{children}</p>;
}

/** Sub-heading inside a section. */
export function SubHeading({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <h3
      id={id}
      className="scroll-mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500"
    >
      {children}
    </h3>
  );
}

/** Plain bordered card — the app's standard surface. */
export function Card({
  title,
  icon,
  meta,
  children,
  accent = false,
}: {
  title?: ReactNode;
  icon?: IconName;
  meta?: ReactNode;
  children: ReactNode;
  accent?: boolean;
}) {
  const Icon = icon ? Icons[icon] : null;
  return (
    <div
      className={
        "rounded-md border bg-white p-4 " +
        (accent ? "border-accent/40 shadow-card" : "border-slate-200")
      }
    >
      {title ? (
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {Icon ? <Icon className="h-4 w-4 shrink-0 text-accent" /> : null}
            <div className="font-medium text-ink-900">{title}</div>
          </div>
          {meta ? <div className="shrink-0">{meta}</div> : null}
        </div>
      ) : null}
      <div className="space-y-2 text-sm text-slate-600">{children}</div>
    </div>
  );
}

/** Responsive card grid (1 col on mobile, `cols` on md+). */
export function CardGrid({
  children,
  cols = 3,
}: {
  children: ReactNode;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={
        "grid gap-4 sm:grid-cols-2 " + (cols === 3 ? "lg:grid-cols-3" : "")
      }
    >
      {children}
    </div>
  );
}

const CALLOUT_STYLES = {
  info: {
    box: "border-slate-200 bg-slate-50",
    icon: "text-slate-500",
    title: "text-ink-900",
    name: "info" as IconName,
  },
  tip: {
    box: "border-emerald-200 bg-emerald-50",
    icon: "text-emerald-600",
    title: "text-emerald-900",
    name: "bulb" as IconName,
  },
  important: {
    box: "border-blue-200 bg-blue-50",
    icon: "text-blue-600",
    title: "text-blue-900",
    name: "alert" as IconName,
  },
  warning: {
    box: "border-amber-200 bg-amber-50",
    icon: "text-amber-600",
    title: "text-amber-900",
    name: "warning" as IconName,
  },
  danger: {
    box: "border-red-200 bg-red-50",
    icon: "text-red-600",
    title: "text-red-900",
    name: "warning" as IconName,
  },
} as const;

export type CalloutTone = keyof typeof CALLOUT_STYLES;

/** Tip / Important / Warning box. */
export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: CalloutTone;
  title?: ReactNode;
  children: ReactNode;
}) {
  const s = CALLOUT_STYLES[tone];
  const Icon = Icons[s.name];
  return (
    <div className={`rounded-md border p-3.5 ${s.box}`}>
      <div className="flex gap-2.5">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.icon}`} />
        <div className="min-w-0 space-y-1 text-sm">
          {title ? (
            <div className={`font-semibold ${s.title}`}>{title}</div>
          ) : null}
          <div className="leading-relaxed text-slate-700">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Numbered step, used for the issue lifecycle and quick-start checklists. */
export function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="relative flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
        {n}
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <div className="text-sm font-medium text-ink-900">{title}</div>
        {children ? (
          <div className="mt-1 space-y-1.5 text-sm leading-relaxed text-slate-600">
            {children}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="space-y-4">{children}</ol>;
}

/** Scannable checklist with tick boxes (static — nothing is persisted). */
export function CheckList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-slate-700">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 text-[11px] font-semibold text-slate-500">
            {i + 1}
          </span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** Bulleted rule list — short lines, easy to scan. */
export function RuleList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-2.5 text-sm leading-relaxed text-slate-700"
        >
          <Icons.check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Can do" / "Cannot do" pair, used in the role cards. */
export function CanCannot({
  can,
  cannot,
}: {
  can: ReactNode[];
  cannot: ReactNode[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Can do
        </div>
        <ul className="space-y-1.5">
          {can.map((c, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <Icons.check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="leading-relaxed">{c}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-700">
          Cannot do
        </div>
        <ul className="space-y-1.5">
          {cannot.map((c, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <Icons.cross className="mt-1 h-3.5 w-3.5 shrink-0 text-red-500" />
              <span className="leading-relaxed">{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Vertical on mobile, horizontal from md up — mirrors correctly in RTL. */
export function FlowDiagram({
  steps,
}: {
  steps: { title: ReactNode; caption?: ReactNode }[];
}) {
  return (
    <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
      {steps.map((s, i) => (
        <div
          key={i}
          className="flex flex-col items-stretch gap-2 md:flex-1 md:flex-row md:items-center"
        >
          <div className="flex-1 rounded-md border border-slate-200 bg-white p-3 text-center">
            <div className="text-sm font-medium text-ink-900">{s.title}</div>
            {s.caption ? (
              <div className="mt-0.5 text-xs text-slate-500">{s.caption}</div>
            ) : null}
          </div>
          {i < steps.length - 1 ? (
            <div className="flex items-center justify-center text-slate-400">
              <Icons.chevronDown className="h-4 w-4 md:hidden" />
              <Icons.chevronRight className="hidden h-4 w-4 md:block rtl:md:rotate-180" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Permission matrix
// ---------------------------------------------------------------------------

export type Mark = "yes" | "no" | "partial";

function MarkCell({ mark }: { mark: Mark }) {
  if (mark === "yes")
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <Icons.check className="h-4 w-4" />
        <span className="sr-only">Allowed</span>
      </span>
    );
  if (mark === "partial")
    return (
      <span className="inline-flex items-center gap-1 text-amber-600">
        <Icons.dash className="h-4 w-4" />
        <span className="sr-only">Partly allowed</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-slate-300">
      <Icons.cross className="h-4 w-4" />
      <span className="sr-only">Not allowed</span>
    </span>
  );
}

export type PermissionRow = {
  action: string;
  support: Mark;
  admin: Mark;
  owner: Mark;
  note?: string;
};

// Helper to compare role for highlighting (handles both Role type and string)
function isHighlighted(
  highlight: Role | string | undefined,
  role: Role,
): boolean {
  if (!highlight) return false;
  return highlight === role || highlight === role.toLowerCase();
}

export function PermissionTable({
  rows,
  highlight,
}: {
  rows: PermissionRow[];
  highlight?: Role | string;
}) {
  const col = (role: Role) =>
    isHighlighted(highlight, role) ? "bg-accent/5 font-medium" : "";
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="table w-full min-w-[560px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th>Action</th>
            <th className={`w-24 text-center ${col("SUPPORT")}`}>Support</th>
            <th className={`w-24 text-center ${col("ADMIN")}`}>Admin</th>
            <th className={`w-24 text-center ${col("OWNER")}`}>Owner</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.action}>
              <td>
                <div className="text-ink-900">{r.action}</div>
                {r.note ? (
                  <div className="mt-0.5 text-xs text-slate-500">{r.note}</div>
                ) : null}
              </td>
              <td className={`text-center ${col("SUPPORT")}`}>
                <MarkCell mark={r.support} />
              </td>
              <td className={`text-center ${col("ADMIN")}`}>
                <MarkCell mark={r.admin} />
              </td>
              <td className={`text-center ${col("OWNER")}`}>
                <MarkCell mark={r.owner} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Simple two/three column reference table (routes, fields, comparisons). */
export function RefTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="table w-full min-w-[520px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((c, j) => (
                <td key={j} className="align-top text-slate-600">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badges + FAQ
// ---------------------------------------------------------------------------

const ROLE_BADGE: Record<Role, string> = {
  OWNER: "border-violet-200 bg-violet-50 text-violet-700",
  ADMIN: "border-blue-200 bg-blue-50 text-blue-700",
  SUPPORT: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const ROLE_TEXT: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  SUPPORT: "Support",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center rounded border px-2 text-xs font-medium ${ROLE_BADGE[role]}`}
    >
      {ROLE_TEXT[role]}
    </span>
  );
}

/** Neutral status pill (used for "no status field", route labels, etc.). */
export function Pill({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}

/** Inline route / code reference. */
export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[12px] text-slate-700">
      {children}
    </code>
  );
}

/** Expandable FAQ entry — native <details> so it works without JS. */
export function Faq({
  question,
  children,
}: {
  question: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-md border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3.5 text-sm font-medium text-ink-900 hover:bg-slate-50">
        <span>{question}</span>
        <Icons.chevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-2 border-t border-slate-200 p-3.5 text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </details>
  );
}
