// API: POST a CSV export. Body: { platform, kind: "posts" | "followers", csv }
import { NextResponse } from "next/server";
import { importCsv } from "@/lib/social/csv";
import { isPlatform } from "@/lib/social/platforms";

export async function POST(req: Request) {
  const body = await req.json();
  if (!isPlatform(body.platform) || typeof body.csv !== "string") {
    return NextResponse.json({ error: "platform and csv are required" }, { status: 400 });
  }
  const result = await importCsv(body.platform, body.kind === "followers" ? "followers" : "posts", body.csv);
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
