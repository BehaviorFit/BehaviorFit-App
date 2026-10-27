"use client";
// Shared building blocks for the Social pages

import { useCallback, useEffect, useState } from "react";
import { PLATFORM_INFO, type Platform } from "@/lib/social/platforms";
import type { Analytics } from "@/lib/social/analytics";
import type { Recommendation } from "@/lib/social/recommendations";

export type Task = { id: number; title: string; platform: string | null; dueDate: string | null; done: boolean };

// The dashboard API returns Analytics with dates serialized as strings
export type Dashboard = Analytics & {
  recommendations: Recommendation[];
  tasks: Task[];
  connected: Platform[];
  hasDemoData: boolean;
};

export function useDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const load = useCallback(async () => {
    const res = await fetch("/api/social/dashboard");
    setData(await res.json());
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch, same pattern as the clients pages
    load();
  }, [load]);
  return { data, reload: load };
}

export function Card({ title, action, children, className = "" }: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white rounded-xl shadow p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3 gap-2">
          {title && <h2 className="font-semibold text-gray-900 flex items-center gap-2">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const info = PLATFORM_INFO[platform as Platform];
  if (!info) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: info.color }} aria-hidden />
      {info.label}
    </span>
  );
}

// Change indicator: arrow + label so direction never relies on color alone
export function Delta({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  if (value === null || !Number.isFinite(value)) return <span className="text-xs text-gray-400">no comparison yet</span>;
  const up = value >= 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-green-700" : "text-red-700"}`}>
      {up ? "▲" : "▼"} {Math.abs(Math.round(value * 100))}%{suffix}
    </span>
  );
}

export const fmtInt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString());
export const fmtPct = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined ? "—" : `${(n * 100).toFixed(digits)}%`;

export function timeAgo(iso: string) {
  const h = (Date.now() - new Date(iso).getTime()) / 36e5;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export const PRIORITY_STYLE = {
  high: { label: "High", icon: "●", className: "bg-red-50 text-red-800 border-red-200" },
  medium: { label: "Medium", icon: "◆", className: "bg-amber-50 text-amber-800 border-amber-200" },
  low: { label: "Low", icon: "○", className: "bg-gray-50 text-gray-600 border-gray-200" },
} as const;

export const CATEGORY_STYLE: Record<string, string> = {
  lead: "bg-blue-50 text-blue-800",
  question: "bg-violet-50 text-violet-800",
  praise: "bg-green-50 text-green-800",
  spam: "bg-gray-100 text-gray-500",
  general: "bg-gray-50 text-gray-700",
};

export const buttonClass =
  "bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition disabled:opacity-50";
export const secondaryButtonClass =
  "border border-gray-300 bg-white text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50";
export const inputClass =
  "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
