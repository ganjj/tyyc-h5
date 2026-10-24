import { NextResponse, type NextRequest } from "next/server";
import { getDb, setSetting } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  setSetting(getDb(), "chat_total_used", "0");
  return NextResponse.json({ ok: true, chat_total_used: "0" });
}
