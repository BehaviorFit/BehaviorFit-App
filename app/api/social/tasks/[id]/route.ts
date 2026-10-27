// API: PATCH a task (mark done) / DELETE it
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const task = await prisma.socialTask.update({
    where: { id: Number(id) },
    data: { done: Boolean(body.done) },
  });
  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.socialTask.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
