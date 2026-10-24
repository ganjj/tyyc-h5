import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const rows = getDb()
    .prepare(
      "SELECT id, name, year, hit_rate FROM lotteries ORDER BY sort ASC, id DESC"
    )
    .all();
  return NextResponse.json(rows);
}
