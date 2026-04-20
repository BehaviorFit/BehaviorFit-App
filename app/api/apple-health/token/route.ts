// GET  /api/apple-health/token  → return existing token (or create one)
// POST /api/apple-health/token  → regenerate token
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

function makeToken() {
  return randomBytes(32).toString("hex");
}

async function getOrCreate() {
  const existing = await prisma.apiToken.findFirst();
  if (existing) return existing;
  return prisma.apiToken.create({ data: { token: makeToken() } });
}

export async function GET() {
  const record = await getOrCreate();
  return NextResponse.json({ token: record.token, label: record.label });
}

export async function POST() {
  const existing = await prisma.apiToken.findFirst();
  if (existing) {
    const updated = await prisma.apiToken.update({
      where: { id: existing.id },
      data: { token: makeToken() },
    });
    return NextResponse.json({ token: updated.token, label: updated.label });
  }
  const created = await prisma.apiToken.create({ data: { token: makeToken() } });
  return NextResponse.json({ token: created.token, label: created.label });
}
