// API: GET a single client with all their data
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id: Number(id) },
    include: {
      fitnessData: { orderBy: { date: "desc" } },
      lifts: { orderBy: { date: "desc" } },
      biometrics: { orderBy: { date: "desc" } },
    },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Delete all related records first, then delete client
  await prisma.fitnessData.deleteMany({ where: { clientId: Number(id) } });
  await prisma.lift.deleteMany({ where: { clientId: Number(id) } });
  await prisma.biometrics.deleteMany({ where: { clientId: Number(id) } });
  await prisma.client.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
