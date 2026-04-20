// POST /api/apple-health/sync
// Called automatically by the iOS Shortcut. Authenticates with Bearer token,
// then upserts a day's health metrics so re-runs safely overwrite stale data.
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const stored = await prisma.apiToken.findUnique({ where: { token } });
  if (!stored) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const body = await req.json();

  // Normalise date to "YYYY-MM-DD"
  const date: string = body.date ?? new Date().toISOString().slice(0, 10);

  const entry = await prisma.appleHealthEntry.upsert({
    where: { date },
    update: {
      steps:            body.steps            != null ? Number(body.steps)            : undefined,
      activeCalories:   body.activeCalories   != null ? Number(body.activeCalories)   : undefined,
      exerciseMinutes:  body.exerciseMinutes  != null ? Number(body.exerciseMinutes)  : undefined,
      standHours:       body.standHours       != null ? Number(body.standHours)       : undefined,
      restingHeartRate: body.restingHeartRate != null ? Number(body.restingHeartRate) : undefined,
      avgHeartRate:     body.avgHeartRate     != null ? Number(body.avgHeartRate)     : undefined,
      flightsClimbed:   body.flightsClimbed   != null ? Number(body.flightsClimbed)   : undefined,
      distanceMiles:    body.distanceMiles    != null ? Number(body.distanceMiles)    : undefined,
      sleepHours:       body.sleepHours       != null ? Number(body.sleepHours)       : undefined,
    },
    create: {
      date,
      steps:            body.steps            != null ? Number(body.steps)            : null,
      activeCalories:   body.activeCalories   != null ? Number(body.activeCalories)   : null,
      exerciseMinutes:  body.exerciseMinutes  != null ? Number(body.exerciseMinutes)  : null,
      standHours:       body.standHours       != null ? Number(body.standHours)       : null,
      restingHeartRate: body.restingHeartRate != null ? Number(body.restingHeartRate) : null,
      avgHeartRate:     body.avgHeartRate     != null ? Number(body.avgHeartRate)     : null,
      flightsClimbed:   body.flightsClimbed   != null ? Number(body.flightsClimbed)   : null,
      distanceMiles:    body.distanceMiles    != null ? Number(body.distanceMiles)    : null,
      sleepHours:       body.sleepHours       != null ? Number(body.sleepHours)       : null,
    },
  });

  return NextResponse.json({ success: true, entry });
}
