import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "../src/lib/db";
import {
  DAILY_IP_LIMIT,
  DEFAULT_SYSTEM_LIMIT,
  getQuota,
  parseLimit,
  quotaBlockReason,
} from "../src/lib/quota";

let db: DatabaseSync;

beforeEach(() => {
  db = openDatabase(":memory:", { seed: false });
  db.prepare("INSERT INTO settings(key, value) VALUES ('chat_total_limit', '1000')").run();
  db.prepare("INSERT INTO settings(key, value) VALUES ('chat_total_used', '0')").run();
});

afterEach(() => {
  db.close();
});

function insertChat(ip: string, createdAt: string = new Date().toISOString()) {
  db.prepare(
    "INSERT INTO chat_logs(ip, question, answer, model, created_at) VALUES (?, 'q', 'a', 'qwen-plus', ?)"
  ).run(ip, createdAt);
}

describe("单 IP 当日限额", () => {
  it("当日 3 次后阻止该 IP，不影响其他 IP", () => {
    for (let i = 0; i < DAILY_IP_LIMIT; i++) insertChat("203.0.113.1");
    assert.equal(getQuota(db, "203.0.113.1").perIpToday, DAILY_IP_LIMIT);
    assert.equal(quotaBlockReason(db, "203.0.113.1"), "ip");
    assert.equal(quotaBlockReason(db, "203.0.113.2"), null);
  });

  it("当日不足 3 次不阻止", () => {
    insertChat("203.0.113.3");
    assert.equal(quotaBlockReason(db, "203.0.113.3"), null);
  });

  it("前一日（北京时间）的记录不计入当日", () => {
    const now = new Date("2026-10-23T02:00:00.000Z"); // 北京 10:00
    for (let i = 0; i < DAILY_IP_LIMIT; i++) {
      insertChat("203.0.113.4", "2026-10-22T02:00:00.000Z"); // 北京 10-22 10:00
    }
    assert.equal(getQuota(db, "203.0.113.4", now).perIpToday, 0);
    assert.equal(quotaBlockReason(db, "203.0.113.4", now), null);
  });
});

describe("系统总量限额（累计）", () => {
  it("达到上限后任何 IP 都被阻止", () => {
    db.prepare("UPDATE settings SET value = '1000' WHERE key = 'chat_total_used'").run();
    assert.equal(quotaBlockReason(db, "198.51.100.9"), "system");
  });

  it("未达上限不阻止", () => {
    db.prepare("UPDATE settings SET value = '999' WHERE key = 'chat_total_used'").run();
    assert.equal(quotaBlockReason(db, "198.51.100.10"), null);
  });

  it("系统上限优先于 IP 限制提示", () => {
    db.prepare("UPDATE settings SET value = '1000' WHERE key = 'chat_total_used'").run();
    for (let i = 0; i < DAILY_IP_LIMIT; i++) insertChat("198.51.100.11");
    assert.equal(quotaBlockReason(db, "198.51.100.11"), "system");
  });
});

describe("parseLimit", () => {
  it("合法数字原样返回", () => {
    assert.equal(parseLimit("500"), 500);
    assert.equal(parseLimit("0"), 0);
  });

  it("空值/非法值回退默认值", () => {
    assert.equal(parseLimit(""), DEFAULT_SYSTEM_LIMIT);
    assert.equal(parseLimit("abc"), DEFAULT_SYSTEM_LIMIT);
    assert.equal(parseLimit("-5"), DEFAULT_SYSTEM_LIMIT);
  });
});
