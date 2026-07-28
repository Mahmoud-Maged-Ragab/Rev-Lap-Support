import { getLocale, getTranslations } from "next-intl/server";
import { fmtDay } from "@/lib/format";
import type { DayCount } from "@/lib/history";

/**
 * "Activity over the last 30 days" — created vs edited per day.
 *
 * Server-rendered SVG: no chart library, no client JS, no hydration. Marks
 * follow the house dataviz specs — 2px round-capped lines, hairline solid
 * gridlines, muted axis text, text in ink tokens (never series colors).
 * Series colors (blue #1f6feb / green #008300) are a CVD-validated pair.
 * Native <title> tooltips give per-day values on hover.
 */

const W = 640;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };
const SERIES = {
  created: "#1f6feb",
  edited: "#008300",
} as const;

function niceCeil(v: number): number {
  if (v <= 5) return 5;
  const mag = 10 ** Math.floor(Math.log10(v));
  const step = mag / 2;
  return Math.ceil(v / step) * step;
}

export async function ActivityChart({ perDay }: { perDay: DayCount[] }) {
  const t = await getTranslations("activity");
  const locale = await getLocale();

  const hasData = perDay.some((d) => d.created > 0 || d.edited > 0);
  if (!hasData) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-ink-900">
          {t("chartTitle")}
        </h3>
        <p className="py-10 text-center text-sm text-slate-500">
          {t("noActivity")}
        </p>
      </div>
    );
  }

  const yMax = niceCeil(
    Math.max(...perDay.map((d) => Math.max(d.created, d.edited))),
  );
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (perDay.length <= 1 ? 0 : (i / (perDay.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  const path = (key: "created" | "edited") =>
    perDay.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d[key])}`).join("");

  const yTicks = [0, yMax / 2, yMax].map((v) => Math.round(v));
  // Label every ~7th day so the axis stays uncluttered.
  const xLabelEvery = Math.max(1, Math.ceil(perDay.length / 5));
  const last = perDay[perDay.length - 1];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">{t("chartTitle")}</h3>
        <div className="flex gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: SERIES.created }}
            />
            {t("seriesCreated")}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: SERIES.edited }}
            />
            {t("seriesEdited")}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        role="img"
        aria-label={t("chartTitle")}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="#e1e0d9"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={y(v) + 3.5}
              textAnchor="end"
              fontSize="11"
              fill="#898781"
            >
              {v}
            </text>
          </g>
        ))}

        {perDay.map((d, i) =>
          i % xLabelEvery === 0 ? (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="11"
              fill="#898781"
            >
              {fmtDay(d.date, locale)}
            </text>
          ) : null,
        )}

        <path
          d={path("created")}
          fill="none"
          stroke={SERIES.created}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={path("edited")}
          fill="none"
          stroke={SERIES.edited}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End markers with a surface ring; the last values are the direct labels. */}
        {(["created", "edited"] as const).map((key) => (
          <g key={key}>
            <circle
              cx={x(perDay.length - 1)}
              cy={y(last[key])}
              r="6"
              fill="#ffffff"
            />
            <circle
              cx={x(perDay.length - 1)}
              cy={y(last[key])}
              r="4"
              fill={SERIES[key]}
            />
          </g>
        ))}

        {/* Invisible per-day hit strips: native tooltips, no JS. */}
        {perDay.map((d, i) => {
          const w = innerW / Math.max(1, perDay.length - 1);
          return (
            <rect
              key={i}
              x={x(i) - w / 2}
              y={PAD.top}
              width={w}
              height={innerH}
              fill="transparent"
            >
              <title>
                {`${fmtDay(d.date, locale)} — ${t("seriesCreated")}: ${d.created}, ${t("seriesEdited")}: ${d.edited}`}
              </title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
