import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "./auth";

/** 返回 null 表示已登录，否则返回 401 响应。 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!getSessionFromRequest(req)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  return null;
}
