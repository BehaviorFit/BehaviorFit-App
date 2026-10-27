"use client";
// Page: Every recent post with its numbers — sortable, filterable

import { useEffect, useMemo, useState } from "react";
import { PLATFORMS, PLATFORM_INFO } from "@/lib/social/platforms";
import { Card, PlatformBadge, fmtInt, fmtPct } from "../components/ui";

type Post = {
  id: number;
  platform: string;
  text: string | null;
  format: string;
  permalink: string | null;
  postedAt: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagements: number;
  engagementRate: number | null;
};

type SortKey = "postedAt" | "impressions" | "engagements" | "engagementRate" | "comments";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "postedAt", label: "Date" },
  { key: "impressions", label: "Views" },
  { key: "engagements", label: "Engagements" },
  { key: "comments", label: "Comments" },
  { key: "engagementRate", label: "Eng. rate" },
];

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [platform, setPlatform] = useState("");
  const [sort, setSort] = useState<SortKey>("postedAt");

  useEffect(() => {
    fetch("/api/social/posts").then((r) => r.json()).then(setPosts);
  }, []);

  const rows = useMemo(() => {
    const value = (p: Post) =>
      sort === "postedAt" ? new Date(p.postedAt).getTime()
        : sort === "impressions" ? p.impressions || p.reach
        : (p[sort] ?? -1);
    return (posts ?? [])
      .filter((p) => !platform || p.platform === platform)
      .sort((a, b) => value(b) - value(a));
  }, [posts, platform, sort]);

  if (!posts) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Posts</h1>
          <p className="text-sm text-gray-500">Last 120 days · click a column to sort · engagement rate = engagements ÷ views</p>
        </div>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_INFO[p].label}</option>)}
        </select>
      </div>
      <Card className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">No posts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-2 pr-3">Post</th>
                <th className="py-2 pr-3">Format</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="py-2 pr-3 text-right">
                    <button onClick={() => setSort(c.key)} className={`hover:text-gray-900 ${sort === c.key ? "text-blue-700 font-semibold" : ""}`}>
                      {c.label}{sort === c.key ? " ▼" : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3 max-w-sm">
                    <div className="mb-0.5"><PlatformBadge platform={p.platform} /></div>
                    {p.permalink ? (
                      <a href={p.permalink} target="_blank" rel="noreferrer" className="line-clamp-2 hover:text-blue-700">{p.text || "(no text)"}</a>
                    ) : (
                      <span className="line-clamp-2">{p.text || "(no text)"}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 capitalize text-gray-600">{p.format}</td>
                  <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">{new Date(p.postedAt).toLocaleDateString()}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(p.impressions || p.reach)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(p.engagements)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(p.comments)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-medium">{fmtPct(p.engagementRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
