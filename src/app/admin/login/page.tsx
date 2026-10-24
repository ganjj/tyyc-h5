"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }
      router.replace("/admin");
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1220] px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-center text-xl font-bold text-white">管理后台登录</h1>
        <div className="mt-6 space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="密码"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white active:opacity-80 disabled:opacity-50"
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </div>
      </div>
    </div>
  );
}
