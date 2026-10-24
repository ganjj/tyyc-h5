import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = getDb()
    .prepare(
      "SELECT id, name, year, match_time, hit_rate, content_html, footer_text, created_at, updated_at FROM lotteries WHERE id = ?"
    )
    .get(Number(id));

  if (!row) {
    return NextResponse.json({ error: "未找到该方案" }, { status: 404 });
  }
  return NextResponse.json(row);
}
