import { NextResponse, type NextRequest } from "next/server";
import { getDb, getAllPublicSettings, setSetting } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EDITABLE_KEYS = [
  "home_notice",
  "mask_image",
  "service_wechat1",
  "service_wechat2",
  "service_qq",
  "service_notice",
  "service_qr_1",
  "service_qr_2",
  "service_qr_3",
  "service_email_1",
  "service_email_2",
  "service_email_3",
  "lottery_footer_text",
  "chat_total_limit",
] as const;

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json(getAllPublicSettings(getDb()));
}

export async function PUT(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const db = getDb();
  for (const key of EDITABLE_KEYS) {
    if (key in body) {
      setSetting(db, key, String(body[key] ?? ""));
    }
  }
  return NextResponse.json(getAllPublicSettings(db));
}
