// API: GET open social tasks / POST a new one
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isPlatform } from "@/lib/social/platforms";

export async function GET() {
  const tasks = await prisma.socialTask.findMany({ orderBy: [{ done: "asc" }, { dueDate: "asc" }] });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  const task = await prisma.socialTask.create({
    data: {
      title: body.title.trim(),
      platform: isPlatform(body.platform) ? body.platform : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });
  return NextResponse.json(task);
}
