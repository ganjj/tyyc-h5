import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getParams(params: Promise<{ id: string }>) {
  const { id } = await params;
  return Number(id);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const id = await getParams(params);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const b = body || {};
  const name = String(b.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
  }
  const f = {
    name,
    year: String(b.year || "").trim(),
    match_time: String(b.match_time || "").trim(),
    hit_rate: String(b.hit_rate || "").trim(),
    content_html: String(b.content_html || ""),
    footer_text: String(b.footer_text || ""),
    sort: Number.isFinite(Number(b.sort)) ? Number(b.sort) : 0,
  };

  const db = getDb();
  const info = db
    .prepare(
      `UPDATE lotteries SET name=?, year=?, match_time=?, hit_rate=?, content_html=?, footer_text=?, sort=?, updated_at=datetime('now') WHERE id=?`
    )
    .run(f.name, f.year, f.match_time, f.hit_rate, f.content_html, f.footer_text, f.sort, id);
  if (info.changes === 0) {
    return NextResponse.json({ error: "方案不存在" }, { status: 404 });
  }
  const row = db.prepare("SELECT * FROM lotteries WHERE id = ?").get(id);
  return NextResponse.json(row);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const id = await getParams(params);
  const info = getDb().prepare("DELETE FROM lotteries WHERE id = ?").run(id);
  if (info.changes === 0) {
    return NextResponse.json({ error: "方案不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
