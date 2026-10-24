import { NextResponse, type NextRequest } from "next/server";
import { getDb, getSetting } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { beijingDayRange } from "@/lib/time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const db = getDb();
  const { startIso, endIso } = beijingDayRange();
  const todayCount = (
    db
      .prepare("SELECT COUNT(*) AS c FROM chat_logs WHERE created_at >= ? AND created_at < ?")
      .get(startIso, endIso) as { c: number }
  ).c;
  const todayIpCount = (
    db
      .prepare(
        "SELECT COUNT(DISTINCT ip) AS c FROM chat_logs WHERE created_at >= ? AND created_at < ?"
      )
      .get(startIso, endIso) as { c: number }
  ).c;
  const visitorCount = (db.prepare("SELECT COUNT(*) AS c FROM visitors").get() as { c: number }).c;

  return NextResponse.json({
    totalUsed: Number(getSetting(db, "chat_total_used", "0")) || 0,
    totalLimit: Number(getSetting(db, "chat_total_limit", "1000")) || 0,
    todayCount,
    todayIpCount,
    visitorCount,
  });
}
