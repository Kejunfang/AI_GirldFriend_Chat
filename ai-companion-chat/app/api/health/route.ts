import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      database: "up",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        database: "down",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
