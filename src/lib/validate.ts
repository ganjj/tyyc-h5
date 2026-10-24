export const MAX_QUESTION_WIDTH = 40;

/** 计算输入宽度：中文（含全角）按 2，其余按 1。等价于不超过 20 个汉字或 40 个英文字符。 */
function charWidth(ch: string): number {
  const cp = ch.codePointAt(0)!;
  if (
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK 基本区
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK 扩展 A
    (cp >= 0x3000 && cp <= 0x303f) || // CJK 标点
    (cp >= 0xff00 && cp <= 0xffef) || // 全角字符
    cp > 0xffff // emoji 等补充平面字符
  ) {
    return 2;
  }
  return 1;
}

export function textWidth(input: string): number {
  let width = 0;
  for (const ch of input) {
    width += charWidth(ch);
  }
  return width;
}

/** 从输入中截断到不超过 max 宽度的前缀（中文按 2、英文按 1）。 */
export function truncateToWidth(input: string, max = MAX_QUESTION_WIDTH): string {
  let width = 0;
  let out = "";
  for (const ch of input) {
    const w = charWidth(ch);
    if (width + w > max) break;
    width += w;
    out += ch;
  }
  return out;
}

export type QuestionValidation =
  | { ok: true; value: string; width: number }
  | { ok: false; error: string };

export function validateQuestion(input: unknown): QuestionValidation {
  if (typeof input !== "string") {
    return { ok: false, error: "问题格式不正确" };
  }
  const value = input.trim();
  if (!value) {
    return { ok: false, error: "请输入要咨询的问题" };
  }
  const width = textWidth(value);
  if (width > MAX_QUESTION_WIDTH) {
    return {
      ok: false,
      error: `内容过长：最多 20 个汉字或 40 个英文字符（当前 ${width}/40）`,
    };
  }
  return { ok: true, value, width };
}
