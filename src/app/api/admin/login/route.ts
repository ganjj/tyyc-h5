import { NextResponse, type NextRequest } from "next/server";
import { getDb, verifyPassword } from "@/lib/db";
import { ADMIN_COOKIE, createSessionToken } from "@/lib/auth";
import { getClientIp } from "@/lib/ip";
import { hit, reset } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const ip = getClientIp(req);
  const gate = hit(`login:${ip}`, 10, 10 * 60 * 1000);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: `尝试次数过多，请 ${gate.retryAfterSec} 秒后再试` },
      { status: 429 }
    );
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) {
    return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
  }

  const row = getDb()
    .prepare("SELECT username, password_hash FROM users WHERE username = ?")
    .get(username) as { username: string; password_hash: string } | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  reset(`login:${ip}`);
  const token = createSessionToken(row.username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return res;
}
