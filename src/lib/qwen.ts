export interface QwenResult {
  ok: boolean;
  answer?: string;
  error?: string;
}

const SYSTEM_PROMPT =
  "你是“顶呱呱足球大模型”，面向足彩用户提供理性、合规的数据与分析参考。" +
  "不承诺必中、不诱导投注，倡导理性购彩；回答简洁清晰。";

export async function askQwen(question: string): Promise<QwenResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    console.error("[qwen] DASHSCOPE_API_KEY 未配置");
    return { ok: false, error: "missing_api_key" };
  }

  const url =
    process.env.DASHSCOPE_BASE_URL ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
  const model = process.env.DASHSCOPE_MODEL || "qwen-plus";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`[qwen] 状态码异常: ${res.status}`);
      return { ok: false, error: `api_${res.status}` };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = data.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      console.error("[qwen] 返回为空");
      return { ok: false, error: "empty_answer" };
    }
    return { ok: true, answer: answer.trim() };
  } catch (e) {
    console.error("[qwen] 请求失败", e);
    return { ok: false, error: "fetch_error" };
  } finally {
    clearTimeout(timer);
  }
}
