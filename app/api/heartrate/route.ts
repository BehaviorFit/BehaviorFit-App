// API: Live heart rate relay.
// POST is the webhook target for a phone-side HealthKit export (e.g. the
// "Health Auto Export" app's REST API automation) — Safari itself has no way
// to read Apple Watch/HealthKit data, so the phone app is the only bridge.
// GET returns the most recent reading for the treadmill display to poll.
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Health Auto Export's REST payload nests samples under data.metrics[].data[].
// Older automations / other tools may just POST { bpm } or { heartRate } directly.
// Try both shapes rather than assuming one, since a wrong assumption here
// would silently drop every reading.
function extractBpm(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.bpm === "number") return b.bpm;
  if (typeof b.heartRate === "number") return b.heartRate;

  const data = b.data as Record<string, unknown> | undefined;
  const metrics = data?.metrics;
  if (Array.isArray(metrics)) {
    const hrMetric = metrics.find(
      (m) => typeof m?.name === "string" && /heart.?rate/i.test(m.name)
    );
    const points = hrMetric?.data;
    if (Array.isArray(points) && points.length > 0) {
      const last = points[points.length - 1];
      const qty = last?.qty ?? last?.Avg ?? last?.value;
      if (typeof qty === "number") return Math.round(qty);
    }
  }
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.HEARTRATE_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get("x-webhook-secret") ?? new URL(req.url).searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => null);
  const bpm = extractBpm(body);
  if (bpm === null) {
    return NextResponse.json({ error: "No heart rate value found in payload" }, { status: 400 });
  }

  const reading = await prisma.heartRateReading.create({ data: { bpm } });
  return NextResponse.json({ success: true, bpm: reading.bpm, recordedAt: reading.recordedAt });
}

export async function GET() {
  const latest = await prisma.heartRateReading.findFirst({ orderBy: { recordedAt: "desc" } });
  if (!latest) return NextResponse.json({ bpm: null, recordedAt: null });
  return NextResponse.json({ bpm: latest.bpm, recordedAt: latest.recordedAt });
}
