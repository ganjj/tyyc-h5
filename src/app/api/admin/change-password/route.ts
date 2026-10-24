import { NextResponse, type NextRequest } from "next/server";
import { getDb, hashPassword, verifyPassword } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { oldPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const oldPassword = String(body.oldPassword || "");
  const newPassword = String(body.newPassword || "");
  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: "请输入原密码和新密码" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "新密码至少 6 位" }, { status: 400 });
  }

  const db = getDb();
  const row = db.prepare("SELECT password_hash FROM users WHERE username = 'admin'").get() as
    | { password_hash: string }
    | undefined;
  if (!row || !verifyPassword(oldPassword, row.password_hash)) {
    return NextResponse.json({ error: "原密码不正确" }, { status: 400 });
  }
  db.prepare("UPDATE users SET password_hash = ? WHERE username = 'admin'").run(
    hashPassword(newPassword)
  );
  return NextResponse.json({ ok: true });
}
