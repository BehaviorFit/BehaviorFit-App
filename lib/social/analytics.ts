// Turns raw posts, messages, and follower counts into the numbers the
// dashboard shows: KPIs, weekly trends, best formats/times, and wins.
import type { SocialPost, SocialMessage, FollowerSnapshot } from "@prisma/client";
import { PLATFORMS, PLATFORM_INFO, RESPONSE_GOAL_HOURS, type Platform } from "./platforms";

const DAY = 24 * 60 * 60 * 1000;
export const WEEKS_SHOWN = 12;

export function engagements(p: SocialPost) {
  return p.likes + p.comments + p.shares + p.saves + p.clicks;
}

// Engagement rate = engagements ÷ impressions (falls back to reach). Null when unknown.
export function engagementRate(p: SocialPost): number | null {
  const base = p.impressions || p.reach;
  return base > 0 ? engagements(p) / base : null;
}

// Pooled rate across many posts (total engagements ÷ total views), so one tiny post can't skew it
function pooledRate(posts: SocialPost[]): number | null {
  let eng = 0;
  let base = 0;
  for (const p of posts) {
    const b = p.impressions || p.reach;
    if (b > 0) {
      eng += engagements(p);
      base += b;
    }
  }
  return base > 0 ? eng / base : null;
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / previous;
}

// Monday 00:00 local time of the week containing `d`
export function startOfWeek(d: Date) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

export function isOverdue(m: SocialMessage, now: Date) {
  return (
    m.status === "new" &&
    (m.category === "lead" || m.category === "question") &&
    now.getTime() - m.receivedAt.getTime() > RESPONSE_GOAL_HOURS * 60 * 60 * 1000
  );
}

export type PlatformSummary = {
  platform: Platform;
  hasData: boolean;
  followers: number | null;
  followerChange28d: number | null;
  postsThisWeek: number;
  weeklyGoal: number;
  goalStreak: number; // consecutive completed weeks at or above goal
  goalHitRate4w: number; // share of the last 4 completed weeks that met goal
  impressions28d: number;
  impressionsChange: number | null;
  engagements28d: number;
  engagementsChange: number | null;
  engagementRate28d: number | null;
  engagementRatePrev28d: number | null;
  engagementRateChange: number | null;
  openMessages: number;
  overdueMessages: number;
  daysSinceLastPost: number | null;
};

export type WeeklyPoint = {
  weekStart: string;
  values: Record<Platform, number | null>;
};

export type BreakdownRow = {
  platform: Platform;
  key: string;
  posts: number;
  engagementRate: number | null;
  avgEngagements: number;
};

export type TopPost = {
  id: number;
  platform: Platform;
  text: string;
  format: string;
  postedAt: string;
  permalink: string | null;
  impressions: number;
  engagements: number;
  engagementRate: number | null;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function hourBucket(h: number) {
  if (h < 9) return "Early (before 9am)";
  if (h < 12) return "Morning (9–12)";
  if (h < 15) return "Midday (12–3pm)";
  if (h < 18) return "Afternoon (3–6pm)";
  return "Evening (after 6pm)";
}
export const HOUR_BUCKETS = [
  "Early (before 9am)", "Morning (9–12)", "Midday (12–3pm)", "Afternoon (3–6pm)", "Evening (after 6pm)",
];
export { DAY_NAMES };

function breakdown(
  posts: SocialPost[],
  keyOf: (p: SocialPost) => string
): BreakdownRow[] {
  const groups = new Map<string, SocialPost[]>();
  for (const p of posts) {
    const k = `${p.platform}|${keyOf(p)}`;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  return [...groups.entries()].map(([k, ps]) => {
    const [platform, key] = k.split("|");
    return {
      platform: platform as Platform,
      key,
      posts: ps.length,
      engagementRate: pooledRate(ps),
      avgEngagements: ps.reduce((s, p) => s + engagements(p), 0) / ps.length,
    };
  });
}

export function buildAnalytics(
  posts: SocialPost[],
  messages: SocialMessage[],
  snapshots: FollowerSnapshot[],
  now = new Date()
) {
  const thisWeek = startOfWeek(now);
  const t28 = new Date(now.getTime() - 28 * DAY);
  const t56 = new Date(now.getTime() - 56 * DAY);
  const t90 = new Date(now.getTime() - 90 * DAY);

  const weekStarts: Date[] = [];
  for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
    weekStarts.push(new Date(thisWeek.getTime() - i * 7 * DAY));
  }
  const weekIndex = (d: Date) => {
    const diff = Math.round((startOfWeek(d).getTime() - weekStarts[0].getTime()) / (7 * DAY));
    return diff >= 0 && diff < WEEKS_SHOWN ? diff : -1;
  };

  const summaries: PlatformSummary[] = PLATFORMS.map((platform) => {
    const ps = posts.filter((p) => p.platform === platform);
    const ms = messages.filter((m) => m.platform === platform);
    const snaps = snapshots
      .filter((s) => s.platform === platform)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const last28 = ps.filter((p) => p.postedAt >= t28);
    const prev28 = ps.filter((p) => p.postedAt >= t56 && p.postedAt < t28);

    const latest = snaps.at(-1) ?? null;
    const base = [...snaps].reverse().find((s) => s.date <= t28) ?? snaps[0] ?? null;

    // Posting cadence vs goal, by week
    const goal = PLATFORM_INFO[platform].weeklyPostGoal;
    const perWeek = weekStarts.map(
      (ws) => ps.filter((p) => startOfWeek(p.postedAt).getTime() === ws.getTime()).length
    );
    const completed = perWeek.slice(0, -1);
    let streak = 0;
    for (let i = completed.length - 1; i >= 0 && completed[i] >= goal; i--) streak++;
    const last4 = completed.slice(-4);

    const lastPost = ps.reduce<Date | null>(
      (max, p) => (!max || p.postedAt > max ? p.postedAt : max),
      null
    );
    const sum = (arr: SocialPost[], f: (p: SocialPost) => number) =>
      arr.reduce((s, p) => s + f(p), 0);

    const er = pooledRate(last28);
    const erPrev = pooledRate(prev28);
    const imp = sum(last28, (p) => p.impressions || p.reach);
    const impPrev = sum(prev28, (p) => p.impressions || p.reach);
    const eng = sum(last28, engagements);
    const engPrev = sum(prev28, engagements);

    return {
      platform,
      hasData: ps.length > 0 || snaps.length > 0 || ms.length > 0,
      followers: latest?.followers ?? null,
      followerChange28d: latest && base && latest !== base ? latest.followers - base.followers : null,
      postsThisWeek: perWeek.at(-1) ?? 0,
      weeklyGoal: goal,
      goalStreak: streak,
      goalHitRate4w: last4.length ? last4.filter((n) => n >= goal).length / last4.length : 0,
      impressions28d: imp,
      impressionsChange: prev28.length ? pctChange(imp, impPrev) : null,
      engagements28d: eng,
      engagementsChange: prev28.length ? pctChange(eng, engPrev) : null,
      engagementRate28d: er,
      engagementRatePrev28d: erPrev,
      engagementRateChange: prev28.length >= 3 && last28.length >= 3 ? pctChange(er, erPrev) : null,
      openMessages: ms.filter((m) => m.status === "new" && m.category !== "spam").length,
      overdueMessages: ms.filter((m) => isOverdue(m, now)).length,
      daysSinceLastPost: lastPost ? Math.floor((now.getTime() - lastPost.getTime()) / DAY) : null,
    };
  });

  // Weekly trend series
  const emptyWeeks = () =>
    weekStarts.map(() => ({ linkedin: 0, instagram: 0, facebook: 0 }) as Record<Platform, number>);
  const engWeekly = emptyWeeks();
  const postsWeekly = emptyWeeks();
  const impWeekly = emptyWeeks();
  for (const p of posts) {
    const i = weekIndex(p.postedAt);
    if (i < 0) continue;
    const pl = p.platform as Platform;
    engWeekly[i][pl] += engagements(p);
    postsWeekly[i][pl] += 1;
    impWeekly[i][pl] += p.impressions || p.reach;
  }
  const hasPosts = (pl: Platform) => posts.some((p) => p.platform === pl);
  const toSeries = (rows: Record<Platform, number>[]): WeeklyPoint[] =>
    rows.map((r, i) => ({
      weekStart: weekStarts[i].toISOString(),
      values: {
        linkedin: hasPosts("linkedin") ? r.linkedin : null,
        instagram: hasPosts("instagram") ? r.instagram : null,
        facebook: hasPosts("facebook") ? r.facebook : null,
      },
    }));

  // Followers: last known count at the end of each week
  const followersWeekly: WeeklyPoint[] = weekStarts.map((ws) => {
    const end = new Date(ws.getTime() + 7 * DAY);
    const values = {} as Record<Platform, number | null>;
    for (const pl of PLATFORMS) {
      const s = snapshots
        .filter((x) => x.platform === pl && x.date < end)
        .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
      values[pl] = s ? s.followers : null;
    }
    return { weekStart: ws.toISOString(), values };
  });

  const recent = posts.filter((p) => p.postedAt >= t90);
  const toTop = (p: SocialPost): TopPost => ({
    id: p.id,
    platform: p.platform as Platform,
    text: p.text ?? "",
    format: p.format,
    postedAt: p.postedAt.toISOString(),
    permalink: p.permalink,
    impressions: p.impressions || p.reach,
    engagements: engagements(p),
    engagementRate: engagementRate(p),
  });
  // Top 5 per platform by engagement rate (ignoring posts with too few views to judge)
  const topPosts = PLATFORMS.flatMap((pl) =>
    recent
      .filter((p) => p.platform === pl && (p.impressions || p.reach) >= 50)
      .sort((a, b) => (engagementRate(b) ?? 0) - (engagementRate(a) ?? 0))
      .slice(0, 5)
      .map(toTop)
  );

  // Wins — positive feedback is part of the system, not an afterthought
  const wins: string[] = [];
  for (const s of summaries) {
    const label = PLATFORM_INFO[s.platform].label;
    if (s.goalStreak >= 2) wins.push(`${label}: ${s.goalStreak}-week posting streak at goal`);
    if (s.engagementRateChange !== null && s.engagementRateChange >= 0.15)
      wins.push(`${label}: engagement rate up ${Math.round(s.engagementRateChange * 100)}% vs the prior 4 weeks`);
    if (s.followerChange28d !== null && s.followerChange28d > 0)
      wins.push(`${label}: +${s.followerChange28d.toLocaleString()} followers in 28 days`);
  }
  const best = [...topPosts].sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0))[0];
  if (best && best.engagementRate !== null)
    wins.push(
      `Top post (90d): ${PLATFORM_INFO[best.platform].label} ${best.format} at ${(best.engagementRate * 100).toFixed(1)}% engagement`
    );

  return {
    generatedAt: now.toISOString(),
    summaries,
    trends: {
      engagements: toSeries(engWeekly),
      impressions: toSeries(impWeekly),
      posts: toSeries(postsWeekly),
      followers: followersWeekly,
    },
    byFormat: breakdown(recent, (p) => p.format),
    byDay: breakdown(recent, (p) => DAY_NAMES[p.postedAt.getDay()]),
    byHour: breakdown(recent, (p) => hourBucket(p.postedAt.getHours())),
    topPosts,
    wins,
  };
}

export type Analytics = ReturnType<typeof buildAnalytics>;
