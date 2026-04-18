// API: GET all clients / POST a new client
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const body = await req.json();
  const client = await prisma.client.create({
    data: {
      name: body.name,
      email: body.email || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(client);
}
