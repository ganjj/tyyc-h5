import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MAX_QUESTION_WIDTH, textWidth, truncateToWidth, validateQuestion } from "../src/lib/validate";

describe("textWidth", () => {
  it("中文按 2 个宽度单位", () => {
    assert.equal(textWidth("你好"), 4);
    assert.equal(textWidth("顶呱呱足球大模型"), 16);
  });

  it("英文按 1 个宽度单位", () => {
    assert.equal(textWidth("abc"), 3);
    assert.equal(textWidth("Abc123"), 6);
  });

  it("混合与全角标点", () => {
    assert.equal(textWidth("你好abc"), 7);
    assert.equal(textWidth("你好，！"), 8);
  });
});

describe("validateQuestion", () => {
  it("20 个汉字通过", () => {
    assert.equal(validateQuestion("测".repeat(20)).ok, true);
  });

  it("21 个汉字失败", () => {
    const r = validateQuestion("测".repeat(21));
    assert.equal(r.ok, false);
    assert.match((r as { error: string }).error, /过长/);
  });

  it("40 个英文字符通过，41 个失败", () => {
    assert.equal(validateQuestion("a".repeat(40)).ok, true);
    assert.equal(validateQuestion("a".repeat(41)).ok, false);
  });

  it("空字符串失败", () => {
    const r = validateQuestion("   ");
    assert.equal(r.ok, false);
    assert.match((r as { error: string }).error, /请输入/);
  });

  it("非字符串失败", () => {
    assert.equal(validateQuestion(123).ok, false);
  });

  it("上限常量与校验一致", () => {
    assert.equal(MAX_QUESTION_WIDTH, 40);
  });
});

describe("truncateToWidth", () => {
  it("超过 20 个汉字按 20 个截断", () => {
    assert.equal(truncateToWidth("测".repeat(21)), "测".repeat(20));
  });
  it("超过 40 个英文字符按 40 个截断", () => {
    assert.equal(truncateToWidth("a".repeat(41)), "a".repeat(40));
  });
  it("混合宽度在边界截断", () => {
    assert.equal(truncateToWidth("你好abc", 6), "你好ab");
    assert.equal(truncateToWidth("a".repeat(39) + "你"), "a".repeat(39));
    assert.equal(truncateToWidth("a".repeat(38) + "你"), "a".repeat(38) + "你");
  });
  it("未超长原样返回", () => {
    assert.equal(truncateToWidth("你好abc"), "你好abc");
  });
});
