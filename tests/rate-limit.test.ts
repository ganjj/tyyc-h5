import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hit, reset } from "../src/lib/rate-limit";

describe("hit", () => {
  it("窗口内达到上限后拒绝，并给出重试秒数", () => {
    const key = "login:203.0.113.60";
    const windowMs = 60_000;
    for (let i = 0; i < 10; i++) {
      assert.equal(hit(key, 10, windowMs).allowed, true);
    }
    const blocked = hit(key, 10, windowMs);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSec > 0);
    reset(key);
    assert.equal(hit(key, 10, windowMs).allowed, true);
  });

  it("窗口过期后计数重置", () => {
    const key = "login:203.0.113.61";
    hit(key, 1, 1000, 0);
    assert.equal(hit(key, 1, 1000, 1).allowed, false);
    assert.equal(hit(key, 1, 1000, 2000).allowed, true);
  });

  it("不同 key 互不影响", () => {
    assert.equal(hit("a", 1, 1000).allowed, true);
    assert.equal(hit("b", 1, 1000).allowed, true);
  });
});
