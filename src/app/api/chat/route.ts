import { NextResponse, type NextRequest } from "next/server";
import { getDb, getSetting } from "@/lib/db";
import { getClientIp } from "@/lib/ip";
import { getQuota, quotaBlockReason, DAILY_IP_LIMIT } from "@/lib/quota";
import { validateQuestion } from "@/lib/validate";
import { askQwen } from "@/lib/qwen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ERROR_BUSY = "当前服务繁忙，请联系客服";
const ERROR_IP_LIMIT = "提示当日已达到使用上限，请联系客服即可";

/** 查询当前 IP 的剩余次数与系统状态，用于聊天页初始展示。 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const db = getDb();
  const blocked = quotaBlockReason(db, ip);
  const { perIpToday } = getQuota(db, ip);
  return NextResponse.json({
    blocked,
    remaining: Math.max(0, DAILY_IP_LIMIT - perIpToday),
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" && "question" in body
      ? (body as { question: unknown }).question
      : undefined;
  const validation = validateQuestion(raw);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const ip = getClientIp(req);
  const db = getDb();

  // 1) 系统总量（累计，不自动重置）
  const blocked = quotaBlockReason(db, ip);
  if (blocked === "system") {
    return NextResponse.json({ code: "busy", error: ERROR_BUSY }, { status: 429 });
  }
  // 2) 单 IP 当日 3 次（北京时间自然日）
  if (blocked === "ip") {
    return NextResponse.json({ code: "ip_limit", error: ERROR_IP_LIMIT }, { status: 429 });
  }

  // 3) 调用千问模型
  const result = await askQwen(validation.value);
  if (!result.ok || typeof result.answer !== "string") {
    console.error("[chat] 模型调用失败:", result.error);
    return NextResponse.json({ code: "model_error", error: ERROR_BUSY }, { status: 502 });
  }

  // 4) 落日志 + 计数（事务，防并发超发）
  const nowIso = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    // 落库前再次校验系统总量，保证并发下不超发
    const q = getQuota(db, ip);
    if (q.systemUsed >= q.systemLimit) {
      db.exec("ROLLBACK");
      return NextResponse.json({ code: "busy", error: ERROR_BUSY }, { status: 429 });
    }
    if (q.perIpToday >= DAILY_IP_LIMIT) {
      db.exec("ROLLBACK");
      return NextResponse.json({ code: "ip_limit", error: ERROR_IP_LIMIT }, { status: 429 });
    }

    db.prepare(
      "INSERT INTO chat_logs(ip, question, answer, model, created_at) VALUES (?, ?, ?, 'qwen-plus', ?)"
    ).run(ip, validation.value, result.answer, nowIso);
    getSetting(db, "chat_total_limit", "1000"); // 保证 key 存在
    db.prepare(
      "UPDATE settings SET value = CAST(value AS INTEGER) + 1 WHERE key = 'chat_total_used'"
    ).run();
    db.exec("COMMIT");
  } catch (e) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error("[chat] 落库失败", e);
    return NextResponse.json({ code: "model_error", error: ERROR_BUSY }, { status: 500 });
  }

  const remaining = Math.max(0, DAILY_IP_LIMIT - getQuota(db, ip).perIpToday);
  return NextResponse.json({
    answer: result.answer,
    remaining,
  });
}
