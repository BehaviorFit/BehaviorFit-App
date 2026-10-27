"use client";
// Page: Social Command Center — what's happening, what changed, what to do next

import { useState } from "react";
import Link from "next/link";
import { PLATFORM_INFO, PLATFORMS } from "@/lib/social/platforms";
import { WeeklyLineChart } from "./components/Charts";
import {
  Card, Delta, PlatformBadge, PRIORITY_STYLE, buttonClass, secondaryButtonClass, inputClass,
  fmtInt, fmtPct, useDashboard,
} from "./components/ui";

export default function CommandCenter() {
  const { data, reload } = useDashboard();
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPlatform, setTaskPlatform] = useState("");
  const [taskDue, setTaskDue] = useState("");

  async function sync() {
    setSyncing(true);
    setSyncNote(null);
    const res = await fetch("/api/social/sync", { method: "POST", body: "{}" });
    const { results } = await res.json();
    setSyncNote(
      results.length
        ? results.map((r: { platform: string; ok: boolean; message: string }) =>
            `${PLATFORM_INFO[r.platform as keyof typeof PLATFORM_INFO].label}: ${r.ok ? r.message : `failed — ${r.message}`}`
          ).join(" · ")
        : "No accounts connected yet — see Connect & Import."
    );
    await reload();
    setSyncing(false);
  }

  async function loadDemo() {
    await fetch("/api/social/demo", { method: "POST" });
    await reload();
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await fetch("/api/social/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle, platform: taskPlatform || null, dueDate: taskDue || null }),
    });
    setTaskTitle(""); setTaskDue("");
    await reload();
  }

  async function completeTask(id: number) {
    await fetch(`/api/social/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    });
    await reload();
  }

  if (!data) return <p className="text-gray-500">Loading…</p>;

  const anyData = data.summaries.some((s) => s.hasData);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Social Command Center</h1>
          <p className="text-sm text-gray-500">LinkedIn · Instagram · Facebook — last 28 days vs the 28 before</p>
        </div>
        <div className="flex gap-2">
          <button onClick={sync} disabled={syncing} className={buttonClass}>
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>
      {syncNote && <p className="text-sm text-gray-600 -mt-3">{syncNote}</p>}

      {data.hasDemoData && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-2 text-sm">
          You&apos;re viewing <strong>sample data</strong>. Connect your accounts or import CSVs in{" "}
          <Link href="/social/settings" className="underline">Connect &amp; Import</Link>, then clear the sample data there.
        </div>
      )}

      {!anyData && (
        <Card>
          <div className="text-center py-6">
            <h2 className="text-lg font-semibold mb-1">No data yet</h2>
            <p className="text-gray-600 text-sm mb-4">
              Connect Facebook/Instagram, import a LinkedIn analytics CSV, or load sample data to explore.
            </p>
            <div className="flex justify-center gap-2">
              <Link href="/social/settings" className={buttonClass}>Connect accounts</Link>
              <button onClick={loadDemo} className={secondaryButtonClass}>Load sample data</button>
            </div>
          </div>
        </Card>
      )}

      {/* Platform scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.summaries.map((s) => {
          const goalPct = Math.min(1, s.postsThisWeek / s.weeklyGoal);
          return (
            <Card key={s.platform}>
              <div className="flex items-center justify-between mb-3">
                <PlatformBadge platform={s.platform} />
                {s.openMessages > 0 && (
                  <Link href={`/social/inbox?platform=${s.platform}`} className="text-xs text-blue-700 hover:underline">
                    {s.openMessages} open{s.overdueMessages ? ` · ${s.overdueMessages} overdue` : ""}
                  </Link>
                )}
              </div>
              {!s.hasData ? (
                <p className="text-sm text-gray-500">Not connected yet.</p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tabular-nums">{fmtInt(s.followers)}</span>
                    <span className="text-sm text-gray-500">followers</span>
                  </div>
                  <div className="text-xs text-gray-600 mb-4">
                    {s.followerChange28d === null ? "—" : `${s.followerChange28d >= 0 ? "+" : ""}${s.followerChange28d.toLocaleString()} in 28 days`}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Posts this week</span>
                      <span className="font-medium tabular-nums">{s.postsThisWeek} / {s.weeklyGoal}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded">
                      <div className="h-full rounded" style={{ width: `${goalPct * 100}%`, background: PLATFORM_INFO[s.platform].color }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {s.goalStreak > 0 ? `${s.goalStreak}-week streak at goal` : "No current streak"} · {Math.round(s.goalHitRate4w * 4)}/4 recent weeks at goal
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-gray-500">Engagement rate</dt>
                      <dd className="font-semibold tabular-nums">{fmtPct(s.engagementRate28d)}</dd>
                      <Delta value={s.engagementRateChange} />
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Engagements</dt>
                      <dd className="font-semibold tabular-nums">{fmtInt(s.engagements28d)}</dd>
                      <Delta value={s.engagementsChange} />
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Impressions</dt>
                      <dd className="font-semibold tabular-nums">{fmtInt(s.impressions28d)}</dd>
                      <Delta value={s.impressionsChange} />
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Last post</dt>
                      <dd className="font-semibold">
                        {s.daysSinceLastPost === null ? "—" : s.daysSinceLastPost === 0 ? "Today" : `${s.daysSinceLastPost}d ago`}
                      </dd>
                    </div>
                  </dl>
                </>
              )}
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* What to work on */}
        <Card title="What to work on" className="lg:col-span-2">
          {data.recommendations.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing flagged — you&apos;re on track.</p>
          ) : (
            <ul className="divide-y">
              {data.recommendations.map((r) => {
                const p = PRIORITY_STYLE[r.priority];
                return (
                  <li key={r.id} className="py-3 flex gap-3 items-start">
                    <span className={`shrink-0 text-xs border rounded px-2 py-0.5 ${p.className}`}>
                      <span aria-hidden>{p.icon}</span> {p.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link href={r.href} className="font-medium text-gray-900 hover:text-blue-700">{r.title}</Link>
                      <p className="text-sm text-gray-600">{r.detail}</p>
                    </div>
                    {r.platform && <PlatformBadge platform={r.platform} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Wins to keep doing">
            {data.wins.length === 0 ? (
              <p className="text-sm text-gray-500">Wins show up here as your data builds.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.wins.map((w) => (
                  <li key={w} className="flex gap-2"><span className="text-green-700" aria-hidden>✓</span>{w}</li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="My to-dos">
            <form onSubmit={addTask} className="space-y-2 mb-3">
              <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className={inputClass}
                placeholder="e.g. Film 3 Reels on habit stacking" />
              <div className="flex gap-2">
                <select value={taskPlatform} onChange={(e) => setTaskPlatform(e.target.value)} className={inputClass}>
                  <option value="">Any platform</option>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_INFO[p].label}</option>)}
                </select>
                <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className={inputClass} />
                <button className={buttonClass}>Add</button>
              </div>
            </form>
            {data.tasks.length === 0 ? (
              <p className="text-sm text-gray-500">No open to-dos.</p>
            ) : (
              <ul className="space-y-2">
                {data.tasks.map((t) => {
                  // Due dates are stored as UTC midnight, so compare calendar dates as strings
                  const now = new Date();
                  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                  const overdue = t.dueDate && t.dueDate.slice(0, 10) < today;
                  return (
                    <li key={t.id} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" onChange={() => completeTask(t.id)} className="mt-1" aria-label={`Complete ${t.title}`} />
                      <div className="flex-1">
                        <div>{t.title}</div>
                        <div className="text-xs text-gray-500 flex gap-2">
                          {t.platform && <PlatformBadge platform={t.platform} />}
                          {t.dueDate && (
                            <span className={overdue ? "text-red-700 font-medium" : ""}>
                              {overdue ? "Overdue · " : "Due "}{new Date(t.dueDate).toLocaleDateString(undefined, { timeZone: "UTC" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {anyData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Engagements per week">
            <WeeklyLineChart points={data.trends.engagements} label="Engagements" partialLast />
          </Card>
          <Card title="Followers">
            <WeeklyLineChart points={data.trends.followers} label="Followers" zeroBased={false} />
          </Card>
        </div>
      )}
    </div>
  );
}
