import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getDb } from "./db";

export const ADMIN_COOKIE = "tyyc_admin";
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;

function getAuthSecret(): string {
  // getDb() 初始化时已保证 auth_secret 存在
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = 'auth_secret'")
    .get() as { value: string } | undefined;
  if (!row || !row.value) {
    throw new Error("auth_secret 未初始化");
  }
  return row.value;
}

function sign(payloadBase64: string): string {
  return createHmac("sha256", getAuthSecret()).update(payloadBase64).digest("base64url");
}

export interface Session {
  username: string;
}

export function createSessionToken(username: string): string {
  const payload: { u: string; exp: number } = {
    u: username,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): Session | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      u?: string;
      exp?: number;
    };
    if (!parsed.u || typeof parsed.exp !== "number" || parsed.exp < Date.now()) {
      return null;
    }
    return { username: parsed.u };
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): Session | null {
  return verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);
}
