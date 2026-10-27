// LinkedIn Company Page sync via the Community Management API.
// Requires a LinkedIn developer app approved for the Community Management API
// and a token with r_organization_social + rw_organization_admin scopes.
// LinkedIn does not expose personal-profile analytics or DMs through its API —
// use CSV import (Settings) for your personal profile's post analytics.
import { prisma } from "@/lib/prisma";
import { classifyMessage } from "../classify";

const API = "https://api.linkedin.com/rest";

// LinkedIn versions its API by month and retires versions after about a year.
// Default to two months back so the version is always current but published.
function apiVersion() {
  if (process.env.LINKEDIN_API_VERSION) return process.env.LINKEDIN_API_VERSION;
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Json = Record<string, unknown>;

async function li(path: string, token: string): Promise<Json> {
  const res = await fetch(`${API}/${path}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": apiVersion(),
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });
  const body = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) throw new Error((body.message as string) ?? `LinkedIn API error ${res.status}`);
  return body;
}

function formatOf(content: Json | undefined) {
  if (!content) return "text";
  if ("multiImage" in content) return "carousel";
  if ("article" in content) return "link";
  const media = content.media as { id?: string } | undefined;
  if (media?.id?.includes("document")) return "document";
  if (media?.id?.includes("video")) return "video";
  if (media?.id?.includes("image")) return "image";
  return "text";
}

export async function syncLinkedIn(orgId: string, token: string) {
  const org = `urn:li:organization:${orgId}`;
  const enc = encodeURIComponent;

  const size = await li(`networkSizes/${enc(org)}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`, token);
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const followers = Number(size.firstDegreeSize ?? 0);
  await prisma.followerSnapshot.upsert({
    where: { platform_date: { platform: "linkedin", date } },
    create: { platform: "linkedin", date, followers, source: "api" },
    update: { followers },
  });

  const postsBody = await li(`posts?author=${enc(org)}&q=author&count=50`, token);
  const posts = (postsBody.elements as Json[]) ?? [];

  // Stats are fetched in one batch call, keyed by share/ugcPost URN
  const shares = posts.map((p) => String(p.id)).filter((id) => id.startsWith("urn:li:share:"));
  const ugc = posts.map((p) => String(p.id)).filter((id) => id.startsWith("urn:li:ugcPost:"));
  const stats = new Map<string, Json>();
  const warnings: string[] = [];
  try {
    let q = `organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${enc(org)}`;
    if (shares.length) q += `&shares=List(${shares.map(enc).join(",")})`;
    if (ugc.length) q += `&ugcPosts=List(${ugc.map(enc).join(",")})`;
    if (shares.length || ugc.length) {
      const body = await li(q, token);
      for (const el of (body.elements as Json[]) ?? []) {
        const key = String(el.share ?? el.ugcPost ?? "");
        stats.set(key, (el.totalShareStatistics as Json) ?? {});
      }
    }
  } catch (e) {
    warnings.push(`LinkedIn post stats not synced: ${(e as Error).message}`);
  }

  for (const p of posts) {
    const id = String(p.id);
    const s = stats.get(id) ?? {};
    const data = {
      text: (p.commentary as string) ?? null,
      permalink: `https://www.linkedin.com/feed/update/${id}/`,
      postedAt: new Date(Number(p.publishedAt ?? p.createdAt ?? Date.now())),
      format: formatOf(p.content as Json | undefined),
      impressions: Number(s.impressionCount ?? 0),
      reach: Number(s.uniqueImpressionsCount ?? 0),
      likes: Number(s.likeCount ?? 0),
      comments: Number(s.commentCount ?? 0),
      shares: Number(s.shareCount ?? 0),
      clicks: Number(s.clickCount ?? 0),
      source: "api",
    };
    await prisma.socialPost.upsert({
      where: { platform_externalId: { platform: "linkedin", externalId: id } },
      create: { platform: "linkedin", externalId: id, ...data },
      update: data,
    });

    if (data.comments > 0) {
      try {
        const body = await li(`socialActions/${enc(id)}/comments?count=20`, token);
        for (const c of (body.elements as Json[]) ?? []) {
          if (String(c.actor ?? "") === org) continue; // your page's own replies
          const text = String((c.message as { text?: string })?.text ?? "");
          if (!text) continue;
          const externalId = String(c.id ?? c.commentUrn ?? `${id}-${(c.created as { time?: number })?.time}`);
          await prisma.socialMessage.upsert({
            where: { platform_externalId: { platform: "linkedin", externalId } },
            create: {
              platform: "linkedin", kind: "comment", externalId, author: "LinkedIn member", text,
              permalink: data.permalink, receivedAt: new Date(Number((c.created as { time?: number })?.time ?? Date.now())),
              category: classifyMessage(text), source: "api",
            },
            update: { text },
          });
        }
      } catch (e) {
        warnings.push(`Comments not synced for a post: ${(e as Error).message}`);
      }
    }
  }

  return { name: org, posts: posts.length, warnings };
}
