// API: POST a new lift entry
import { prisma } from "@/lib/prisma";
import { appendLift } from "@/lib/sheets";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const lift = await prisma.lift.create({
    data: {
      clientId: Number(body.clientId),
      date: new Date(body.date),
      exercise: body.exercise,
      sets: body.sets ? Number(body.sets) : null,
      reps: body.reps ? Number(body.reps) : null,
      weight: body.weight ? Number(body.weight) : null,
      unit: body.unit || "lbs",
      notes: body.notes || null,
    },
  });

  const client = await prisma.client.findUnique({
    where: { id: lift.clientId },
    select: { name: true },
  });

  appendLift({ ...lift, clientName: client?.name ?? "" }).catch((err) =>
    console.error("Google Sheets sync failed (lifts):", err)
  );

  return NextResponse.json(lift);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  await prisma.lift.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
