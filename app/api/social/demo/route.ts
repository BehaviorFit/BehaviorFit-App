// API: POST loads sample data / DELETE removes it (your real data is untouched)
import { NextResponse } from "next/server";
import { seedDemoData, clearDemoData } from "@/lib/social/demo";

export async function POST() {
  await seedDemoData();
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  await clearDemoData();
  return NextResponse.json({ success: true });
}
