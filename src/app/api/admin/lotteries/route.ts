import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeBody(body: Record<string, unknown> | undefined) {
  const b = body || {};
  return {
    name: String(b.name || "").trim(),
    year: String(b.year || "").trim(),
    match_time: String(b.match_time || "").trim(),
    hit_rate: String(b.hit_rate || "").trim(),
    content_html: String(b.content_html || ""),
    footer_text: String(b.footer_text || ""),
    sort: Number.isFinite(Number(b.sort)) ? Number(b.sort) : 0,
  };
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const rows = getDb()
    .prepare("SELECT * FROM lotteries ORDER BY sort ASC, id DESC")
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const f = normalizeBody(body);
  if (!f.name) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }
  const db = getDb();
  const info = db
    .prepare(
      "INSERT INTO lotteries(name, year, match_time, hit_rate, content_html, footer_text, sort) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(f.name, f.year, f.match_time, f.hit_rate, f.content_html, f.footer_text, f.sort);
  const id = Number(info.lastInsertRowid);
  const row = db.prepare("SELECT * FROM lotteries WHERE id = ?").get(id);
  return NextResponse.json(row, { status: 201 });
}
