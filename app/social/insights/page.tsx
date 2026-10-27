"use client";
// Page: What's working (from your data) + the best-practices playbook

import { useState } from "react";
import { BEST_PRACTICES, PLATFORMS, PLATFORM_INFO, type Platform } from "@/lib/social/platforms";
import { DAY_NAMES, HOUR_BUCKETS, type BreakdownRow } from "@/lib/social/analytics";
import { BarList, WeeklyLineChart } from "../components/Charts";
import { Card, PlatformBadge, fmtInt, fmtPct, useDashboard } from "../components/ui";

// Need at least this many posts in a bucket before we call it a pattern
const MIN_POSTS = 2;

function rowsFor(rows: BreakdownRow[], platform: Platform, order?: string[]) {
  const mine = rows.filter((r) => r.platform === platform && r.posts >= MIN_POSTS);
  const out = mine.map((r) => ({ key: r.key, value: r.engagementRate, n: r.posts }));
  return order
    ? out.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
    : out.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
}

const WEEK_ORDER = [...DAY_NAMES.slice(1), DAY_NAMES[0]];
const HOUR_ORDER = HOUR_BUCKETS;

export default function InsightsPage() {
  const { data } = useDashboard();
  const [platform, setPlatform] = useState<Platform>("linkedin");

  if (!data) return <p className="text-gray-500">Loading…</p>;

  const summary = data.summaries.find((s) => s.platform === platform)!;
  const top = data.topPosts.filter((p) => p.platform === platform).slice(0, 5);
  const fmt = rowsFor(data.byFormat, platform);
  const days = rowsFor(data.byDay, platform, WEEK_ORDER);
  const hours = rowsFor(data.byHour, platform, HOUR_ORDER);
  const best = (rows: { key: string; value: number | null; n: number }[]) =>
    [...rows].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];

  const bestFmt = best(fmt);
  const bestDay = best(days);
  const bestHour = best(hours);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Insights &amp; Playbook</h1>
          <p className="text-sm text-gray-500">
            Patterns from your last 90 days. Small samples are noisy — treat these as hypotheses to test, not rules.
          </p>
        </div>
        <div className="flex gap-1 bg-white rounded-lg shadow p-1">
          {PLATFORMS.map((p) => (
            <button key={p} onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 rounded-md text-sm transition ${platform === p ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}>
              {PLATFORM_INFO[p].label}
            </button>
          ))}
        </div>
      </div>

      {!summary.hasData ? (
        <Card><p className="text-sm text-gray-500">No {PLATFORM_INFO[platform].label} data yet. Connect or import it in Connect &amp; Import.</p></Card>
      ) : (
        <>
          {/* Headline findings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Best format", v: bestFmt },
              { label: "Best day", v: bestDay },
              { label: "Best time", v: bestHour },
            ].map(({ label, v }) => (
              <Card key={label}>
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-xl font-bold capitalize">{v ? v.key : "Need more posts"}</div>
                {v && summary.engagementRate28d ? (
                  <div className="text-xs text-gray-600">
                    {fmtPct(v.value)} engagement vs {fmtPct(summary.engagementRate28d)} average · {v.n} posts
                  </div>
                ) : null}
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Engagement rate by format">
              <BarList rows={fmt} platform={platform} baseline={summary.engagementRate28d} />
              <p className="text-xs text-gray-500 mt-3">Dark tick = your 28-day average.</p>
            </Card>
            <Card title="By day of week">
              <BarList rows={days} platform={platform} baseline={summary.engagementRate28d} />
            </Card>
            <Card title="By time of day">
              <BarList rows={hours} platform={platform} baseline={summary.engagementRate28d} />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title={`Top ${PLATFORM_INFO[platform].label} posts (90 days)`}>
              {top.length === 0 ? (
                <p className="text-sm text-gray-500">Not enough posts with view data yet.</p>
              ) : (
                <ol className="space-y-3">
                  {top.map((p, i) => (
                    <li key={p.id} className="flex gap-3 text-sm">
                      <span className="text-gray-400 tabular-nums w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        {p.permalink ? (
                          <a href={p.permalink} target="_blank" rel="noreferrer" className="line-clamp-2 hover:text-blue-700">{p.text || "(no text)"}</a>
                        ) : (
                          <p className="line-clamp-2">{p.text || "(no text)"}</p>
                        )}
                        <div className="text-xs text-gray-500 capitalize">
                          {p.format} · {new Date(p.postedAt).toLocaleDateString()} · {fmtInt(p.impressions)} views
                        </div>
                      </div>
                      <span className="font-semibold tabular-nums">{fmtPct(p.engagementRate)}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="text-xs text-gray-500 mt-3">Repurpose your top posts — a winner on one platform is your best bet for the next.</p>
            </Card>
            <Card title="Impressions per week">
              <WeeklyLineChart points={data.trends.impressions} label="Impressions" partialLast />
            </Card>
          </div>
        </>
      )}

      {/* Playbook */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={<><PlatformBadge platform={platform} /> playbook</>}>
          <ul className="space-y-3">
            {BEST_PRACTICES[platform].map((p) => (
              <li key={p.title}>
                <div className="font-medium text-sm">{p.title}</div>
                <p className="text-sm text-gray-600">{p.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Every platform: the system">
          <ul className="space-y-3">
            {BEST_PRACTICES.all.map((p) => (
              <li key={p.title}>
                <div className="font-medium text-sm">{p.title}</div>
                <p className="text-sm text-gray-600">{p.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
