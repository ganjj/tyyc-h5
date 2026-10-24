import type { DatabaseSync } from "node:sqlite";
import { beijingDayRange } from "./time";
import { getSetting } from "./db";

export const DAILY_IP_LIMIT = 3;
export const DEFAULT_SYSTEM_LIMIT = 1000;

/** 解析系统上限配置：空值/非法值回退默认值，显式 0 视为关闭服务。 */
export function parseLimit(raw: string): number {
  const text = String(raw ?? "").trim();
  if (!text) return DEFAULT_SYSTEM_LIMIT;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_SYSTEM_LIMIT;
  return Math.floor(n);
}

export interface QuotaSnapshot {
  perIpToday: number;
  systemUsed: number;
  systemLimit: number;
}

export function getQuota(
  db: DatabaseSync,
  ip: string,
  now: Date = new Date()
): QuotaSnapshot {
  const { startIso, endIso } = beijingDayRange(now);
  const row = db
    .prepare(
      "SELECT COUNT(*) AS c FROM chat_logs WHERE ip = ? AND created_at >= ? AND created_at < ?"
    )
    .get(ip, startIso, endIso) as { c: number };

  const systemUsed = Number(getSetting(db, "chat_total_used", "0")) || 0;
  const systemLimit = parseLimit(getSetting(db, "chat_total_limit", "1000"));

  return { perIpToday: row.c, systemUsed, systemLimit };
}

/** 返回被限制的原因：'system' 系统总量用尽；'ip' 当日本机次数用尽；null 表示可正常使用。 */
export function quotaBlockReason(
  db: DatabaseSync,
  ip: string,
  now: Date = new Date()
): "system" | "ip" | null {
  const q = getQuota(db, ip, now);
  if (q.systemUsed >= q.systemLimit) return "system";
  if (q.perIpToday >= DAILY_IP_LIMIT) return "ip";
  return null;
}
