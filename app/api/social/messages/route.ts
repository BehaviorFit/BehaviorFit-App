// API: GET inbox messages / POST a message you log by hand (e.g. a LinkedIn DM)
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { classifyMessage } from "@/lib/social/classify";
import { isPlatform } from "@/lib/social/platforms";

export async function GET() {
  const messages = await prisma.socialMessage.findMany({ orderBy: { receivedAt: "desc" }, take: 500 });
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!isPlatform(body.platform) || !body.text?.trim()) {
    return NextResponse.json({ error: "platform and text are required" }, { status: 400 });
  }
  const message = await prisma.socialMessage.create({
    data: {
      platform: body.platform,
      kind: ["dm", "comment", "mention"].includes(body.kind) ? body.kind : "dm",
      externalId: `manual-${Date.now()}`,
      author: body.author || null,
      text: body.text.trim(),
      permalink: body.permalink || null,
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
      category: classifyMessage(body.text),
      source: "manual",
    },
  });
  return NextResponse.json(message);
}
