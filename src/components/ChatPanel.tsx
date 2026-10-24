"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MAX_QUESTION_WIDTH, textWidth, truncateToWidth } from "@/lib/validate";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const width = textWidth(input);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d: { remaining?: number; blocked?: string | null }) => {
        if (d.blocked === "system") setNotice("当前服务繁忙，请联系客服");
        else if (d.blocked === "ip") setNotice("提示当日已达到使用上限，请联系客服即可");
        else if (typeof d.remaining === "number") setNotice(`今日剩余咨询次数：${d.remaining} 次`);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function submit() {
    if (loading) return;
    const value = input.trim();
    if (!value) {
      setError("请输入要咨询的问题");
      return;
    }
    const w = textWidth(value);
    if (w > MAX_QUESTION_WIDTH) {
      setError(`内容过长：最多 20 个汉字或 40 个英文字符（当前 ${w}/40）`);
      return;
    }
    setError("");
    setMessages((m) => [...m, { role: "user", content: value }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
      });
      const data = (await res.json()) as { answer?: string; error?: string; remaining?: number };
      if (!res.ok) {
        setNotice("");
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.error || "服务繁忙，请联系客服" },
        ]);
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.answer || "" }]);
      if (typeof data.remaining === "number") {
        setNotice(
          data.remaining > 0
            ? `今日剩余咨询次数：${data.remaining} 次`
            : "提示当日已达到使用上限，请联系客服即可"
        );
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "网络异常，请稍后再试" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-gradient-to-b from-[#f2f7ff] to-white">
      <header className="relative border-b border-[#e4efff] bg-white px-4 py-3 text-center shadow-[0_2px_12px_rgba(47,128,237,0.06)]">
        <Link
          href="/"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500"
          aria-label="返回首页"
        >
          ← 返回
        </Link>
        <h1 className="text-lg font-bold text-[#1e6fd9]">顶呱呱足球大模型</h1>
        <p className="text-xs text-slate-400">AI 智能咨询 · 当日 3 次免费机会</p>
      </header>

      {/* 对话框：位于回复展示区上方 */}
      <section className="border-b border-[#e4efff] bg-white p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              if (textWidth(v) <= MAX_QUESTION_WIDTH) {
                setInput(v);
              } else if (!(e.nativeEvent as InputEvent).isComposing) {
                setInput(truncateToWidth(v, MAX_QUESTION_WIDTH));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
            }}
            placeholder="请输入你的问题（20 字 / 40 字符内）"
            className="min-w-0 flex-1 rounded-full border border-[#dceaff] bg-[#f5f9ff] px-4 py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#1e6fd9] focus:bg-white"
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="shrink-0 rounded-full bg-gradient-to-r from-[#2f80ed] to-[#1e6fd9] px-5 py-2 text-sm font-medium text-white shadow-[0_4px_12px_rgba(47,128,237,0.30)] transition-transform active:scale-95 disabled:opacity-50"
          >
            {loading ? "发送中" : "发送"}
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-red-500">{error}</span>
          <span className={width > MAX_QUESTION_WIDTH ? "text-red-500" : "text-slate-400"}>
            {width}/{MAX_QUESTION_WIDTH}
          </span>
        </div>
      </section>

      {/* 大模型回复展示区 */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="rounded-xl border border-[#e4efff] bg-white p-4 text-center text-sm text-slate-500 shadow-[0_4px_16px_rgba(47,128,237,0.08)]">
            您好，我是顶呱呱足球大模型，足彩相关问题都可以问我。
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-gradient-to-br from-[#2f80ed] to-[#1e6fd9] px-4 py-2 text-sm text-white shadow-[0_4px_12px_rgba(47,128,237,0.25)]"
                  : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-[#e4efff] bg-white px-4 py-2 text-sm leading-6 text-slate-800 shadow-[0_4px_16px_rgba(47,128,237,0.08)]"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-[#e4efff] bg-white px-4 py-2 text-sm text-slate-400">
              正在思考…
            </div>
          </div>
        )}
        {notice && <p className="pb-2 text-center text-xs text-[#1e6fd9]">{notice}</p>}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
