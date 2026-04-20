// GET /api/apple-health/data?days=30  → last N days of health entries
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Number(searchParams.get("days") ?? 30), 365);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const entries = await prisma.appleHealthEntry.findMany({
    where: { date: { gte: cutoffStr } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(entries);
}
