"use client";
// Lightweight SVG charts — no chart library needed.
// Weekly line chart (one shared y-axis, hover crosshair + tooltip, legend,
// direct end labels, table view) and a horizontal bar list for breakdowns.

import { useState } from "react";
import { PLATFORMS, PLATFORM_INFO, type Platform } from "@/lib/social/platforms";
import type { WeeklyPoint } from "@/lib/social/analytics";

const W = 640;
const H = 220;
const PAD = { top: 12, right: 76, bottom: 26, left: 44 };

// Round a raw step up to 1, 2, 2.5, or 5 × a power of ten
function niceStep(v: number) {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const compact = (n: number) =>
  n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));

export function WeeklyLineChart({
  points,
  label,
  zeroBased = true,
  partialLast = false,
}: {
  points: WeeklyPoint[];
  label: string;
  zeroBased?: boolean;
  // The last point is the current, unfinished week — draw it dashed so it doesn't read as a drop
  partialLast?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const series = PLATFORMS.filter((p) => points.some((pt) => pt.values[p] !== null));
  const all = points.flatMap((pt) => series.map((s) => pt.values[s])).filter((v): v is number => v !== null);

  if (!series.length || !all.length) {
    return <p className="text-sm text-gray-500 py-8 text-center">No data yet.</p>;
  }

  const rawMin = zeroBased ? 0 : Math.min(...all);
  const rawMax = Math.max(...all);
  const step = niceStep((rawMax - rawMin || rawMax || 1) / 4);
  const min = Math.max(0, Math.floor(rawMin / step) * step);
  const max = Math.max(min + step, Math.ceil(rawMax / step) * step);
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - ((v - min) / (max - min || 1)) * ih;
  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(t);

  // Direct end labels, nudged apart so they don't collide
  const ends = series
    .map((s) => {
      const last = [...points].reverse().find((pt) => pt.values[s] !== null);
      return { s, y: last ? y(last.values[s] as number) : 0, v: last?.values[s] ?? 0 };
    })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
  }

  return (
    <div>
      <div className="flex gap-4 mb-2" aria-label="Legend">
        {series.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-0.5 rounded" style={{ background: PLATFORM_INFO[s].color }} />
            {PLATFORM_INFO[s].label}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${label} by week`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#6b7280">
                {compact(t)}
              </text>
            </g>
          ))}
          {points.map((pt, i) =>
            i % 2 === (points.length - 1) % 2 ? (
              <text key={pt.weekStart} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="#6b7280">
                {shortDate(pt.weekStart)}
              </text>
            ) : null
          )}
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="#9ca3af" strokeWidth={1} />
          )}
          {series.map((s) => {
            const coords = points
              .map((pt, i) => (pt.values[s] === null ? null : `${x(i)},${y(pt.values[s] as number)}`))
              .filter((c): c is string => c !== null);
            const solid = partialLast ? coords.slice(0, -1) : coords;
            return (
              <g key={s}>
                <path d={`M${solid.join(" L")}`} fill="none" stroke={PLATFORM_INFO[s].color} strokeWidth={2}
                  strokeLinejoin="round" strokeLinecap="round" />
                {partialLast && coords.length >= 2 && (
                  <path d={`M${coords.slice(-2).join(" L")}`} fill="none" stroke={PLATFORM_INFO[s].color}
                    strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" />
                )}
              </g>
            );
          })}
          {hover !== null &&
            series.map((s) =>
              points[hover].values[s] === null ? null : (
                <circle key={s} cx={x(hover)} cy={y(points[hover].values[s] as number)} r={4.5}
                  fill={PLATFORM_INFO[s].color} stroke="#fff" strokeWidth={2} />
              )
            )}
          {ends.map((e) => (
            <text key={e.s} x={W - PAD.right + 8} y={e.y + 4} fontSize={11} fill="#374151">
              {PLATFORM_INFO[e.s].label}
            </text>
          ))}
          {/* Hit targets: one full-height column per week */}
          {points.map((pt, i) => (
            <rect key={pt.weekStart} x={x(i) - iw / (points.length - 1 || 1) / 2} y={PAD.top}
              width={iw / (points.length - 1 || 1)} height={ih} fill="transparent"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          ))}
        </svg>
        {hover !== null && (
          <div
            className="absolute top-0 pointer-events-none bg-white border border-gray-200 shadow-md rounded-lg px-3 py-2 text-xs"
            style={{
              left: `${(x(hover) / W) * 100}%`,
              transform: x(hover) > W * 0.6 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
            }}
          >
            <div className="font-medium text-gray-900 mb-1">
              Week of {shortDate(points[hover].weekStart)}
              {partialLast && hover === points.length - 1 && <span className="text-gray-500 font-normal"> (so far)</span>}
            </div>
            {series.map((s) => (
              <div key={s} className="flex items-center gap-2 text-gray-700">
                <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_INFO[s].color }} />
                <span className="flex-1">{PLATFORM_INFO[s].label}</span>
                <span className="font-medium tabular-nums">{points[hover].values[s]?.toLocaleString() ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <details className="mt-2">
        <summary className="text-xs text-gray-500 cursor-pointer">
          {partialLast && "Dashed segment = this week so far · "}Show as table
        </summary>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1">Week of</th>
              {series.map((s) => <th key={s} className="text-right">{PLATFORM_INFO[s].label}</th>)}
            </tr>
          </thead>
          <tbody>
            {points.map((pt) => (
              <tr key={pt.weekStart} className="border-t">
                <td className="py-1">{shortDate(pt.weekStart)}</td>
                {series.map((s) => (
                  <td key={s} className="text-right tabular-nums">{pt.values[s]?.toLocaleString() ?? "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

// Horizontal bars, one hue (the platform's) — ranks a breakdown like format or day.
export function BarList({
  rows,
  platform,
  baseline,
}: {
  rows: { key: string; value: number | null; n: number }[];
  platform: Platform;
  baseline?: number | null;
}) {
  const valid = rows.filter((r) => r.value !== null) as { key: string; value: number; n: number }[];
  if (!valid.length) return <p className="text-sm text-gray-500">Not enough posts yet.</p>;
  const max = Math.max(...valid.map((r) => r.value), baseline ?? 0);
  return (
    <ul className="space-y-2">
      {valid.map((r) => (
        <li key={r.key} className="group" title={`${r.key}: ${(r.value * 100).toFixed(2)}% across ${r.n} posts`}>
          <div className="flex justify-between text-xs text-gray-700 mb-0.5">
            <span className="capitalize">{r.key}</span>
            <span className="tabular-nums">
              {(r.value * 100).toFixed(1)}% <span className="text-gray-400">· {r.n} post{r.n === 1 ? "" : "s"}</span>
            </span>
          </div>
          <div className="relative h-2.5 bg-gray-100 rounded">
            <div className="h-full rounded transition-opacity group-hover:opacity-80"
              style={{ width: `${(r.value / max) * 100}%`, background: PLATFORM_INFO[platform].color }} />
            {baseline ? (
              <div className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-gray-700"
                style={{ left: `${(baseline / max) * 100}%` }} title="Your 28-day average" />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
