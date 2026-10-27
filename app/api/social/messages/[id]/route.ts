// API: PATCH a message's status or category / DELETE it
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const STATUSES = ["new", "replied", "done"];
const CATEGORIES = ["lead", "question", "praise", "spam", "general"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: { status?: string; category?: string } = {};
  if (STATUSES.includes(body.status)) data.status = body.status;
  if (CATEGORIES.includes(body.category)) data.category = body.category;
  const message = await prisma.socialMessage.update({ where: { id: Number(id) }, data });
  return NextResponse.json(message);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.socialMessage.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
