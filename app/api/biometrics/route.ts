// API: POST a new biometrics entry
import { prisma } from "@/lib/prisma";
import { appendBiometrics } from "@/lib/sheets";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const entry = await prisma.biometrics.create({
    data: {
      clientId: Number(body.clientId),
      date: new Date(body.date),
      bodyWeight: body.bodyWeight ? Number(body.bodyWeight) : null,
      bodyWeightUnit: body.bodyWeightUnit || "lbs",
      bodyFatPercent: body.bodyFatPercent ? Number(body.bodyFatPercent) : null,
      waistInches: body.waistInches ? Number(body.waistInches) : null,
      hipsInches: body.hipsInches ? Number(body.hipsInches) : null,
      notes: body.notes || null,
    },
  });

  const client = await prisma.client.findUnique({
    where: { id: entry.clientId },
    select: { name: true },
  });

  appendBiometrics({ ...entry, clientName: client?.name ?? "" }).catch((err) =>
    console.error("Google Sheets sync failed (biometrics):", err)
  );

  return NextResponse.json(entry);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  await prisma.biometrics.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
