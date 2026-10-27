// Facebook Page + Instagram (professional account) sync via the Meta Graph API.
// One Page access token covers both: Instagram is reached through the Page's
// linked instagram_business_account.
//
// Meta renames insight metrics fairly often, so every insights call is
// best-effort: if a metric is rejected we keep the post with the counts we have.
import { prisma } from "@/lib/prisma";
import { classifyMessage } from "../classify";

const VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const GRAPH = `https://graph.facebook.com/${VERSION}`;

type Json = Record<string, unknown>;

async function graph(path: string, token: string, params: Record<string, string> = {}): Promise<Json> {
  const url = new URL(path.startsWith("http") ? path : `${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { cache: "no-store" });
  const body = (await res.json()) as Json;
  if (!res.ok || body.error) {
    const err = body.error as { message?: string } | undefined;
    throw new Error(err?.message ?? `Graph API error ${res.status}`);
  }
  return body;
}

// Follow `paging.next` up to `maxPages`
async function graphList(path: string, token: string, params: Record<string, string>, maxPages = 4) {
  const out: Json[] = [];
  let body = await graph(path, token, params);
  for (let page = 0; page < maxPages; page++) {
    out.push(...((body.data as Json[]) ?? []));
    const next = (body.paging as { next?: string } | undefined)?.next;
    if (!next) break;
    body = await graph(next, token);
  }
  return out;
}

// Try each metric name in order; return the first value that works
async function firstMetric(id: string, token: string, names: string[]): Promise<number> {
  for (const metric of names) {
    try {
      const body = await graph(`${id}/insights`, token, { metric });
      const data = (body.data as { values?: { value?: unknown }[] }[]) ?? [];
      const v = data[0]?.values?.[0]?.value;
      if (typeof v === "number") return v;
    } catch {
      // Metric not available for this object/version — try the next name
    }
  }
  return 0;
}

const count = (o: unknown) => ((o as { summary?: { total_count?: number } })?.summary?.total_count ?? 0);

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function saveMessage(platform: string, kind: string, externalId: string, author: string | undefined, text: string, receivedAt: string, permalink?: string | null) {
  if (!text) return;
  await prisma.socialMessage.upsert({
    where: { platform_externalId: { platform, externalId } },
    // Status is yours — sync never overwrites it
    create: {
      platform, kind, externalId, author: author ?? null, text, permalink: permalink ?? null,
      receivedAt: new Date(receivedAt), category: classifyMessage(text), source: "api",
    },
    update: { text, author: author ?? null },
  });
}

export async function syncFacebook(pageId: string, token: string) {
  const page = await graph(pageId, token, { fields: "name,followers_count,fan_count" });
  await prisma.followerSnapshot.upsert({
    where: { platform_date: { platform: "facebook", date: today() } },
    create: { platform: "facebook", date: today(), followers: Number(page.followers_count ?? page.fan_count ?? 0), source: "api" },
    update: { followers: Number(page.followers_count ?? page.fan_count ?? 0) },
  });

  const posts = await graphList(`${pageId}/posts`, token, {
    fields: "id,message,created_time,permalink_url,shares,reactions.summary(true).limit(0),comments.summary(true).limit(25){id,message,from,created_time,permalink_url},attachments{media_type}",
    limit: "25",
  });

  for (const p of posts) {
    const id = String(p.id);
    const mediaType = ((p.attachments as { data?: { media_type?: string }[] })?.data?.[0]?.media_type ?? "").toLowerCase();
    const format = mediaType.includes("video") ? "video" : mediaType.includes("album") ? "carousel" : mediaType.includes("photo") ? "image" : mediaType.includes("link") ? "link" : "text";
    const impressions = await firstMetric(id, token, ["post_media_view", "post_impressions"]);
    const reach = await firstMetric(id, token, ["post_total_media_view_unique", "post_impressions_unique"]);
    const clicks = await firstMetric(id, token, ["post_clicks"]);
    const data = {
      text: (p.message as string) ?? null,
      permalink: (p.permalink_url as string) ?? null,
      postedAt: new Date(p.created_time as string),
      format,
      impressions,
      reach,
      likes: count(p.reactions),
      comments: count(p.comments),
      shares: (p.shares as { count?: number })?.count ?? 0,
      clicks,
      source: "api",
    };
    await prisma.socialPost.upsert({
      where: { platform_externalId: { platform: "facebook", externalId: id } },
      create: { platform: "facebook", externalId: id, ...data },
      update: data,
    });

    const comments = ((p.comments as { data?: Json[] })?.data ?? []);
    for (const c of comments) {
      const from = c.from as { id?: string; name?: string } | undefined;
      if (from?.id === pageId) continue; // your own replies
      await saveMessage("facebook", "comment", String(c.id), from?.name, String(c.message ?? ""), String(c.created_time), (c.permalink_url as string) ?? data.permalink);
    }
  }

  // Messenger conversations need the pages_messaging permission — skip quietly if missing
  const warnings: string[] = [];
  try {
    const convos = await graphList(`${pageId}/conversations`, token, {
      fields: "id,link,updated_time,messages.limit(1){id,message,from,created_time}",
      limit: "25",
    }, 1);
    for (const c of convos) {
      const last = ((c.messages as { data?: Json[] })?.data ?? [])[0];
      if (!last) continue;
      const from = last.from as { id?: string; name?: string } | undefined;
      if (from?.id === pageId) continue; // you sent the last message — nothing to answer
      await saveMessage("facebook", "dm", String(last.id), from?.name, String(last.message ?? ""), String(last.created_time), c.link ? `https://www.facebook.com${c.link}` : null);
    }
  } catch (e) {
    warnings.push(`Facebook messages not synced: ${(e as Error).message}`);
  }

  return { name: String(page.name ?? ""), posts: posts.length, warnings };
}

export async function getInstagramId(pageId: string, token: string) {
  const page = await graph(pageId, token, { fields: "instagram_business_account" });
  const ig = page.instagram_business_account as { id?: string } | undefined;
  return ig?.id ?? null;
}

export async function syncInstagram(pageId: string, token: string) {
  const igId = await getInstagramId(pageId, token);
  if (!igId) throw new Error("This Facebook Page has no linked Instagram professional account.");

  const profile = await graph(igId, token, { fields: "username,followers_count" });
  await prisma.followerSnapshot.upsert({
    where: { platform_date: { platform: "instagram", date: today() } },
    create: { platform: "instagram", date: today(), followers: Number(profile.followers_count ?? 0), source: "api" },
    update: { followers: Number(profile.followers_count ?? 0) },
  });

  const media = await graphList(`${igId}/media`, token, {
    fields: "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count",
    limit: "25",
  });

  for (const m of media) {
    const id = String(m.id);
    const product = String(m.media_product_type ?? "").toUpperCase();
    const type = String(m.media_type ?? "").toUpperCase();
    const format = product === "REELS" ? "reel" : product === "STORY" ? "story" : type === "CAROUSEL_ALBUM" ? "carousel" : type === "VIDEO" ? "video" : "image";
    const data = {
      text: (m.caption as string) ?? null,
      permalink: (m.permalink as string) ?? null,
      postedAt: new Date(m.timestamp as string),
      format,
      impressions: await firstMetric(id, token, ["views", "impressions"]),
      reach: await firstMetric(id, token, ["reach"]),
      likes: Number(m.like_count ?? 0),
      comments: Number(m.comments_count ?? 0),
      shares: await firstMetric(id, token, ["shares"]),
      saves: await firstMetric(id, token, ["saved"]),
      source: "api",
    };
    await prisma.socialPost.upsert({
      where: { platform_externalId: { platform: "instagram", externalId: id } },
      create: { platform: "instagram", externalId: id, ...data },
      update: data,
    });

    if (Number(m.comments_count ?? 0) > 0) {
      const comments = await graphList(`${id}/comments`, token, { fields: "id,text,username,timestamp", limit: "25" }, 1);
      for (const c of comments) {
        if (c.username === profile.username) continue;
        await saveMessage("instagram", "comment", String(c.id), `@${c.username}`, String(c.text ?? ""), String(c.timestamp), data.permalink);
      }
    }
  }

  // Instagram DMs need instagram_manage_messages — skip quietly if missing
  const warnings: string[] = [];
  try {
    const convos = await graphList(`${pageId}/conversations`, token, {
      platform: "instagram",
      fields: "id,updated_time,messages.limit(1){id,message,from,created_time}",
      limit: "25",
    }, 1);
    for (const c of convos) {
      const last = ((c.messages as { data?: Json[] })?.data ?? [])[0];
      if (!last) continue;
      const from = last.from as { id?: string; username?: string } | undefined;
      if (from?.id === igId) continue;
      await saveMessage("instagram", "dm", String(last.id), from?.username ? `@${from.username}` : undefined, String(last.message ?? ""), String(last.created_time), "https://www.instagram.com/direct/inbox/");
    }
  } catch (e) {
    warnings.push(`Instagram DMs not synced: ${(e as Error).message}`);
  }

  return { name: `@${profile.username}`, posts: media.length, warnings };
}
