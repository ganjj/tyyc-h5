import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize")) || 20)
  );
  const ip = (url.searchParams.get("ip") || "").trim();

  const db = getDb();
  const where = ip ? "WHERE ip LIKE ?" : "";
  const params: Array<string | number> = ip ? [`%${ip}%`, pageSize, (page - 1) * pageSize] : [pageSize, (page - 1) * pageSize];

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM chat_logs ${where}`).get(...(ip ? [`%${ip}%`] : [])) as {
      c: number;
    }
  ).c;

  const list = db
    .prepare(
      `SELECT * FROM chat_logs ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...params);

  return NextResponse.json({ total, page, pageSize, list });
}
