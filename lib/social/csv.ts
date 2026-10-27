// CSV import for analytics exports (LinkedIn's export is the main use case,
// since LinkedIn doesn't offer personal-profile analytics through its API).
// Column names are matched loosely, so most platform exports work as-is
// once saved as .csv.
import { prisma } from "@/lib/prisma";
import type { Platform } from "./platforms";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const norm = (s: string) => s.toLowerCase().replace(/^﻿/, "").replace(/[^a-z]/g, "");

// Our field → header names seen in real exports (normalized: lowercase letters only)
const POST_COLUMNS: Record<string, string[]> = {
  text: ["posttitle", "posttext", "text", "update", "updatetitle", "caption", "message", "description", "title", "content"],
  permalink: ["postlink", "permalink", "link", "url", "postlinkurl", "updatelink"],
  postedAt: ["createddate", "date", "postdate", "publishtime", "publishdate", "posted", "postedat", "created", "timestamp"],
  format: ["contenttype", "posttype", "format", "type", "mediatype"],
  impressions: ["impressions", "views", "totalimpressions", "plays"],
  reach: ["reach", "membersreached", "uniqueimpressions", "accountsreached"],
  likes: ["likes", "reactions", "totalreactions"],
  comments: ["comments", "totalcomments"],
  shares: ["shares", "reposts", "totalreposts", "sends"],
  saves: ["saves", "saved"],
  clicks: ["clicks", "linkclicks", "totalclicks"],
  externalId: ["id", "postid", "updateid", "mediaid"],
};

const FOLLOWER_COLUMNS: Record<string, string[]> = {
  date: ["date", "day"],
  followers: ["totalfollowers", "followers", "followercount", "followerstotal"],
};

function mapHeaders(headers: string[], spec: Record<string, string[]>) {
  const n = headers.map(norm);
  const map: Record<string, number> = {};
  for (const [field, names] of Object.entries(spec)) {
    const idx = names.map((name) => n.indexOf(name)).find((i) => i >= 0);
    if (idx !== undefined) map[field] = idx;
  }
  return map;
}

const num = (v: string | undefined) => {
  const n = Number((v ?? "").replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

// Exports often put a title row above the real header — find the first row
// that contains a date-like column.
function findHeaderRow(rows: string[][], spec: Record<string, string[]>, required: string[]) {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const m = mapHeaders(rows[i], spec);
    if (required.every((r) => r in m)) return { index: i, map: m };
  }
  return null;
}

function normalizeFormat(v: string) {
  const t = v.toLowerCase();
  if (t.includes("carousel") || t.includes("album")) return "carousel";
  if (t.includes("document") || t.includes("pdf")) return "document";
  if (t.includes("reel")) return "reel";
  if (t.includes("story")) return "story";
  if (t.includes("video")) return "video";
  if (t.includes("image") || t.includes("photo")) return "image";
  if (t.includes("link") || t.includes("article")) return "link";
  if (t.includes("text")) return "text";
  return "post";
}

export type ImportResult = { imported: number; skipped: number; error?: string };

export async function importCsv(
  platform: Platform,
  kind: "posts" | "followers",
  text: string
): Promise<ImportResult> {
  const rows = parseCsv(text);
  if (kind === "followers") {
    const found = findHeaderRow(rows, FOLLOWER_COLUMNS, ["date", "followers"]);
    if (!found) return { imported: 0, skipped: 0, error: "Couldn't find Date and Followers columns." };
    let imported = 0, skipped = 0;
    for (const r of rows.slice(found.index + 1)) {
      const date = new Date(r[found.map.date]);
      if (isNaN(date.getTime())) { skipped++; continue; }
      date.setHours(0, 0, 0, 0);
      const followers = num(r[found.map.followers]);
      await prisma.followerSnapshot.upsert({
        where: { platform_date: { platform, date } },
        create: { platform, date, followers, source: "csv" },
        update: { followers, source: "csv" },
      });
      imported++;
    }
    return { imported, skipped };
  }

  const found = findHeaderRow(rows, POST_COLUMNS, ["postedAt"]);
  if (!found) return { imported: 0, skipped: 0, error: "Couldn't find a date column (e.g. \"Created date\" or \"Date\")." };
  const m = found.map;
  const get = (r: string[], f: string) => (m[f] !== undefined ? r[m[f]] : undefined);
  let imported = 0, skipped = 0;
  for (const r of rows.slice(found.index + 1)) {
    const postedAt = new Date(get(r, "postedAt") ?? "");
    if (isNaN(postedAt.getTime())) { skipped++; continue; }
    const permalink = get(r, "permalink")?.trim() || null;
    // Stable ID so re-importing the same export updates rather than duplicates
    const externalId =
      get(r, "externalId")?.trim() || permalink || `csv-${postedAt.toISOString()}-${(get(r, "text") ?? "").slice(0, 40)}`;
    const data = {
      text: get(r, "text")?.trim() || null,
      permalink,
      postedAt,
      format: normalizeFormat(get(r, "format") ?? ""),
      impressions: num(get(r, "impressions")),
      reach: num(get(r, "reach")),
      likes: num(get(r, "likes")),
      comments: num(get(r, "comments")),
      shares: num(get(r, "shares")),
      saves: num(get(r, "saves")),
      clicks: num(get(r, "clicks")),
      source: "csv",
    };
    await prisma.socialPost.upsert({
      where: { platform_externalId: { platform, externalId } },
      create: { platform, externalId, ...data },
      update: data,
    });
    imported++;
  }
  return { imported, skipped };
}
