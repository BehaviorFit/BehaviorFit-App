// API: GET recent posts (newest first) with engagement metrics
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { engagements, engagementRate } from "@/lib/social/analytics";

export async function GET() {
  const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
  const posts = await prisma.socialPost.findMany({
    where: { postedAt: { gte: since } },
    orderBy: { postedAt: "desc" },
  });
  return NextResponse.json(
    posts.map((p) => ({ ...p, engagements: engagements(p), engagementRate: engagementRate(p) }))
  );
}
