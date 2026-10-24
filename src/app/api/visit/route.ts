import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/ip";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (ip && ip !== "unknown") {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO visitors(ip, first_seen, last_seen, visits) VALUES (?, ?, ?, 1)
         ON CONFLICT(ip) DO UPDATE SET last_seen = excluded.last_seen, visits = visitors.visits + 1`
      )
      .run(ip, now, now);
  }
  return NextResponse.json({ ok: true });
}
