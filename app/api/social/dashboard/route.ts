// API: GET everything the Command Center and Insights pages need
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { buildAnalytics } from "@/lib/social/analytics";
import { buildRecommendations } from "@/lib/social/recommendations";
import { isConnected } from "@/lib/social/sync";
import { PLATFORMS, type Platform } from "@/lib/social/platforms";

export async function GET() {
  const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
  const [posts, messages, snapshots, tasks] = await Promise.all([
    prisma.socialPost.findMany({ where: { postedAt: { gte: since } } }),
    prisma.socialMessage.findMany({ where: { receivedAt: { gte: since } } }),
    prisma.followerSnapshot.findMany({ where: { date: { gte: since } } }),
    prisma.socialTask.findMany({ where: { done: false }, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] }),
  ]);
  const connected = new Set<Platform>();
  for (const p of PLATFORMS) if (await isConnected(p)) connected.add(p);

  const analytics = buildAnalytics(posts, messages, snapshots);
  return NextResponse.json({
    ...analytics,
    recommendations: buildRecommendations(analytics, connected),
    tasks,
    connected: [...connected],
    hasDemoData: posts.some((p) => p.source === "demo"),
  });
}
