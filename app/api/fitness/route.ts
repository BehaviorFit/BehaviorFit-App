// API: POST a new fitness data entry (Apple Watch: steps, exercise minutes)
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const entry = await prisma.fitnessData.create({
    data: {
      clientId: Number(body.clientId),
      date: new Date(body.date),
      steps: body.steps ? Number(body.steps) : null,
      exerciseMinutes: body.exerciseMinutes ? Number(body.exerciseMinutes) : null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(entry);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  await prisma.fitnessData.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
