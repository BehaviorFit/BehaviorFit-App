// API: Export all data as CSV for Power BI
// Usage: GET /api/export?type=fitness|lifts|biometrics&clientId=1
// Power BI can pull from this URL using "Web" connector

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
    ),
  ];
  return lines.join("\n");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "fitness";
  const clientId = searchParams.get("clientId");
  const where = clientId ? { clientId: Number(clientId) } : {};

  let csv = "";

  if (type === "fitness") {
    const rows = await prisma.fitnessData.findMany({
      where,
      include: { client: { select: { name: true } } },
      orderBy: { date: "asc" },
    });
    csv = toCSV(
      rows.map((r) => ({
        id: r.id,
        clientId: r.clientId,
        clientName: r.client.name,
        date: r.date.toISOString().split("T")[0],
        steps: r.steps,
        exerciseMinutes: r.exerciseMinutes,
        notes: r.notes,
      }))
    );
  } else if (type === "lifts") {
    const rows = await prisma.lift.findMany({
      where,
      include: { client: { select: { name: true } } },
      orderBy: { date: "asc" },
    });
    csv = toCSV(
      rows.map((r) => ({
        id: r.id,
        clientId: r.clientId,
        clientName: r.client.name,
        date: r.date.toISOString().split("T")[0],
        exercise: r.exercise,
        sets: r.sets,
        reps: r.reps,
        weight: r.weight,
        unit: r.unit,
        notes: r.notes,
      }))
    );
  } else if (type === "biometrics") {
    const rows = await prisma.biometrics.findMany({
      where,
      include: { client: { select: { name: true } } },
      orderBy: { date: "asc" },
    });
    csv = toCSV(
      rows.map((r) => ({
        id: r.id,
        clientId: r.clientId,
        clientName: r.client.name,
        date: r.date.toISOString().split("T")[0],
        bodyWeight: r.bodyWeight,
        bodyWeightUnit: r.bodyWeightUnit,
        bodyFatPercent: r.bodyFatPercent,
        waistInches: r.waistInches,
        hipsInches: r.hipsInches,
        notes: r.notes,
      }))
    );
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${type}.csv"`,
    },
  });
}
