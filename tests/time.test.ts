import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { beijingDayRange } from "../src/lib/time";

describe("beijingDayRange", () => {
  it("当前时刻落在当日范围内", () => {
    const now = new Date();
    const { startIso, endIso, date } = beijingDayRange(now);
    assert.ok(startIso <= now.toISOString());
    assert.ok(now.toISOString() < endIso);
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("日期格式为上海自然日", () => {
    const now = new Date("2026-10-23T02:00:00.000Z"); // 北京 10:00
    assert.equal(beijingDayRange(now).date, "2026-10-23");
  });

  it("北京时间 0 点边界", () => {
    // 北京 2026-10-23 00:00 = UTC 2026-10-22 16:00
    const before = beijingDayRange(new Date("2026-10-22T15:59:59.000Z"));
    const after = beijingDayRange(new Date("2026-10-22T16:00:00.000Z"));
    assert.equal(before.date, "2026-10-22");
    assert.equal(after.date, "2026-10-23");
  });
});
