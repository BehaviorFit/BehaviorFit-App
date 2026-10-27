// API: POST to pull fresh data from connected platforms. Body: { platform? }
import { NextResponse } from "next/server";
import { syncAll } from "@/lib/social/sync";
import { isPlatform } from "@/lib/social/platforms";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const results = await syncAll(isPlatform(body.platform) ? body.platform : undefined);
  return NextResponse.json({ results });
}
