// API: GET connection status (tokens are never returned) / POST to save or clear credentials
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await prisma.socialAccount.findMany();
  return NextResponse.json(
    rows.map(({ accessToken, ...rest }) => ({ ...rest, hasToken: Boolean(accessToken) }))
  );
}

// body: { platform: "facebook" | "linkedin", externalId, accessToken } — empty token keeps the saved one;
// { platform, disconnect: true } clears credentials
export async function POST(req: Request) {
  const body = await req.json();
  if (body.platform !== "facebook" && body.platform !== "linkedin") {
    return NextResponse.json({ error: "platform must be facebook (Meta) or linkedin" }, { status: 400 });
  }
  if (body.disconnect) {
    await prisma.socialAccount.updateMany({
      where: { platform: body.platform },
      data: { accessToken: null, externalId: null, lastError: null },
    });
    return NextResponse.json({ success: true });
  }
  const data: { externalId: string | null; accessToken?: string } = {
    externalId: body.externalId?.trim() || null,
  };
  if (body.accessToken?.trim()) data.accessToken = body.accessToken.trim();
  await prisma.socialAccount.upsert({
    where: { platform: body.platform },
    create: { platform: body.platform, ...data },
    update: data,
  });
  return NextResponse.json({ success: true });
}
