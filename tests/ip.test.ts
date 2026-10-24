import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getClientIp } from "../src/lib/ip";

describe("getClientIp", () => {
  it("x-forwarded-for 取首个地址", () => {
    const headers = new Headers();
    headers.set("x-forwarded-for", "203.0.113.7, 10.0.0.1");
    assert.equal(getClientIp({ headers }), "203.0.113.7");
  });

  it("x-real-ip 回退", () => {
    const headers = new Headers();
    headers.set("x-real-ip", "203.0.113.8");
    assert.equal(getClientIp({ headers }), "203.0.113.8");
  });

  it("cf-connecting-ip 回退", () => {
    const headers = new Headers();
    headers.set("cf-connecting-ip", "203.0.113.9");
    assert.equal(getClientIp({ headers }), "203.0.113.9");
  });

  it("无头时回退 ip 字段/unknown", () => {
    assert.equal(getClientIp({ headers: new Headers(), ip: "203.0.113.10" }), "203.0.113.10");
    assert.equal(getClientIp({ headers: new Headers() }), "unknown");
  });
});
