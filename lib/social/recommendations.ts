// "What to work on" — a ranked action list generated from your own numbers.
// Each rule is a simple, readable contingency: if <condition in the data>, then <action>.
import type { Analytics } from "./analytics";
import { PLATFORM_INFO, RESPONSE_GOAL_HOURS, type Platform } from "./platforms";

export type Recommendation = {
  id: string;
  priority: "high" | "medium" | "low";
  platform: Platform | null;
  title: string;
  detail: string;
  href: string;
};

const RANK = { high: 0, medium: 1, low: 2 };

function pct(n: number) {
  return `${Math.round(Math.abs(n) * 100)}%`;
}

const FORMAT_PLURAL: Record<string, string> = {
  carousel: "Carousels", reel: "Reels", video: "Videos", image: "Image posts",
  text: "Text posts", document: "Document posts", link: "Link posts", story: "Stories", post: "Posts",
};

export function buildRecommendations(
  a: Analytics,
  connected: Set<Platform>,
  now = new Date()
): Recommendation[] {
  const recs: Recommendation[] = [];
  // Days left in the Mon–Sun week, including today
  const daysLeft = 7 - ((now.getDay() + 6) % 7);

  const overdue = a.summaries.reduce((s, x) => s + x.overdueMessages, 0);
  const open = a.summaries.reduce((s, x) => s + x.openMessages, 0);
  if (overdue > 0) {
    recs.push({
      id: "inbox-overdue",
      priority: "high",
      platform: null,
      title: `Reply to ${overdue} lead${overdue === 1 ? "" : "s"}/question${overdue === 1 ? "" : "s"} waiting over ${RESPONSE_GOAL_HOURS}h`,
      detail: "Slow replies extinguish the behavior you want most — people reaching out. Clear these first.",
      href: "/social/inbox?filter=overdue",
    });
  } else if (open > 0) {
    recs.push({
      id: "inbox-open",
      priority: "medium",
      platform: null,
      title: `${open} open message${open === 1 ? "" : "s"} in your inbox`,
      detail: "Nothing is overdue yet. A 10-minute inbox block keeps it that way.",
      href: "/social/inbox",
    });
  }

  for (const s of a.summaries) {
    const info = PLATFORM_INFO[s.platform];
    const label = info.label;

    if (!s.hasData) {
      recs.push({
        id: `connect-${s.platform}`,
        priority: "low",
        platform: s.platform,
        title: connected.has(s.platform)
          ? `Sync ${label} to pull in your data`
          : `Connect ${label} or import a CSV`,
        detail: "No data yet, so there's nothing to measure. Connect the account or import an analytics export in Settings.",
        href: "/social/settings",
      });
      continue;
    }

    // Posting cadence
    const needed = s.weeklyGoal - s.postsThisWeek;
    if (s.daysSinceLastPost !== null && s.daysSinceLastPost >= 7) {
      recs.push({
        id: `stale-${s.platform}`,
        priority: "high",
        platform: s.platform,
        title: `No ${label} post in ${s.daysSinceLastPost} days`,
        detail: `Publish something small today to restart the streak — a repurposed top post counts. Goal is ${s.weeklyGoal}/week.`,
        href: "/social/insights",
      });
    } else if (needed > 0) {
      recs.push({
        id: `cadence-${s.platform}`,
        priority: needed >= daysLeft ? "high" : "medium",
        platform: s.platform,
        title: `Publish ${needed} more ${label} post${needed === 1 ? "" : "s"} by Sunday`,
        detail: `${s.postsThisWeek} of ${s.weeklyGoal} this week, ${daysLeft} day${daysLeft === 1 ? "" : "s"} left. Last 4 weeks at goal: ${Math.round(s.goalHitRate4w * 4)}/4.`,
        href: "/social/insights",
      });
    }

    // Best format underused
    const formats = a.byFormat.filter((f) => f.platform === s.platform && f.posts >= 3);
    const avg = s.engagementRate28d;
    const bestFormat = [...formats].sort((x, y) => (y.engagementRate ?? 0) - (x.engagementRate ?? 0))[0];
    const totalRecent = formats.reduce((n, f) => n + f.posts, 0);

    // Engagement rate trend
    if (s.engagementRateChange !== null && s.engagementRateChange <= -0.2) {
      recs.push({
        id: `er-drop-${s.platform}`,
        priority: "medium",
        platform: s.platform,
        title: `${label} engagement rate down ${pct(s.engagementRateChange)} vs the prior 4 weeks`,
        detail: bestFormat
          ? `Your strongest format lately is ${bestFormat.key}. Run 2 weeks leaning on it and compare.`
          : "Change one variable (hook, format, or time) and compare after 2 weeks.",
        href: "/social/insights",
      });
    }

    if (bestFormat && avg && bestFormat.engagementRate && totalRecent > 0) {
      const lift = bestFormat.engagementRate / avg;
      const share = bestFormat.posts / totalRecent;
      if (lift >= 1.3 && share < 0.34) {
        recs.push({
          id: `format-${s.platform}`,
          priority: "medium",
          platform: s.platform,
          title: `${FORMAT_PLURAL[bestFormat.key] ?? bestFormat.key} earn ${lift.toFixed(1)}× your ${label} average — post more of them`,
          detail: `Only ${bestFormat.posts} of your last ${totalRecent} ${label} posts (90 days) were ${bestFormat.key}s.`,
          href: "/social/insights",
        });
      }
    }

    if (s.followerChange28d !== null && s.followerChange28d <= 0) {
      recs.push({
        id: `followers-${s.platform}`,
        priority: "low",
        platform: s.platform,
        title: `${label} followers flat over 28 days`,
        detail: "Growth usually comes from reach formats (Reels, documents) and commenting on others' posts — not from posting more of the same.",
        href: "/social/insights",
      });
    }
  }

  return recs.sort((x, y) => RANK[x.priority] - RANK[y.priority]);
}
