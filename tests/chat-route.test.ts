import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextRequest as NextRequestCtor } from "next/server";
import type { DatabaseSync } from "node:sqlite";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tyyc-route-"));
process.env.DATABASE_PATH = path.join(tmpDir, "test.db");
process.env.DASHSCOPE_API_KEY = "test-key";

let POST: (req: NextRequest) => Promise<Response>;
let GET: (req: NextRequest) => Promise<Response>;
let db: DatabaseSync;
const realFetch = globalThis.fetch;

function chatBody(question: string) {
  return JSON.stringify({ question });
}

function req(ip: string, question: string) {
  return new NextRequestCtor("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: chatBody(question),
  });
}

before(async () => {
  // 拦截千问调用，返回固定答案
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ choices: [{ message: { content: "模拟模型回复" } }] }),
      { status: 200, headers: { "content-type": "application/json" } }
    )) as typeof fetch;
  const mod = await import("../src/app/api/chat/route");
  POST = mod.POST as unknown as (r: NextRequest) => Promise<Response>;
  GET = mod.GET as unknown as (r: NextRequest) => Promise<Response>;
  const { getDb } = await import("../src/lib/db");
  db = getDb();
});

after(() => {
  globalThis.fetch = realFetch;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("POST /api/chat 端到端（限额）", () => {
  it("同一 IP 前 3 次成功，第 4 次返回当日上限提示", async () => {
    const ip = "203.0.113.50";
    for (let i = 0; i < 3; i++) {
      const res = await POST(req(ip, `问题${i + 1}`));
      assert.equal(res.status, 200);
      const d = (await res.json()) as { answer: string; remaining: number };
      assert.equal(d.answer, "模拟模型回复");
      assert.equal(d.remaining, 2 - i);
    }
    const blockedRes = await POST(req(ip, "第四次"));
    assert.equal(blockedRes.status, 429);
    const blocked = (await blockedRes.json()) as { code: string; error: string };
    assert.equal(blocked.code, "ip_limit");
    assert.equal(blocked.error, "提示当日已达到使用上限，请联系客服即可");
  });

  it("GET 返回当前 IP 的剩余次数", async () => {
    const res = await GET(req("203.0.113.50", "ignored"));
    assert.equal(res.status, 200);
    const d = (await res.json()) as { blocked: string | null; remaining: number };
    assert.equal(d.blocked, "ip");
    assert.equal(d.remaining, 0);

    const fresh = await GET(req("203.0.113.99", "ignored"));
    const d2 = (await fresh.json()) as { blocked: string | null; remaining: number };
    assert.equal(d2.blocked, null);
    assert.equal(d2.remaining, 3);
  });

  it("其他 IP 不受影响，且累计计数随成功调用增长", async () => {
    const res = await POST(req("203.0.113.51", "另一个 IP 的问题"));
    assert.equal(res.status, 200);
    const used = (
      db.prepare("SELECT value FROM settings WHERE key = 'chat_total_used'").get() as {
        value: string;
      }
    ).value;
    assert.equal(Number(used), 4);
  });

  it("系统累计达到上限后任何 IP 都返回服务繁忙", async () => {
    db.prepare("UPDATE settings SET value = '1000' WHERE key = 'chat_total_used'").run();
    const res = await POST(req("198.51.100.77", "任意问题"));
    assert.equal(res.status, 429);
    const d = (await res.json()) as { code: string; error: string };
    assert.equal(d.code, "busy");
    assert.equal(d.error, "当前服务繁忙，请联系客服");
  });

  it("超长问题返回 400 且不落库", async () => {
    const before = (
      db.prepare("SELECT COUNT(*) AS c FROM chat_logs").get() as { c: number }
    ).c;
    const res = await POST(req("203.0.113.52", "测".repeat(21)));
    assert.equal(res.status, 400);
    const after = (db.prepare("SELECT COUNT(*) AS c FROM chat_logs").get() as { c: number }).c;
    assert.equal(after, before);
  });
});
