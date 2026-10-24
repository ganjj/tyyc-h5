"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

interface Stats {
  totalUsed: number;
  totalLimit: number;
  todayCount: number;
  todayIpCount: number;
  visitorCount: number;
}

interface Log {
  id: number;
  ip: string;
  question: string;
  answer: string;
  model: string;
  created_at: string;
}

function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [ipFilter, setIpFilter] = useState("");
  const [appliedIp, setAppliedIp] = useState("");
  const [error, setError] = useState("");

  const loadLogs = useCallback(async (p: number, ip = "") => {
    try {
      const qs = new URLSearchParams({ page: String(p), pageSize: "10" });
      if (ip) qs.set("ip", ip);
      const res = await fetch(`/api/admin/logs?${qs.toString()}`);
      if (!res.ok) return;
      const d = (await res.json()) as { total: number; list: Log[] };
      setLogs(d.list || []);
      setTotal(d.total || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setError("统计数据加载失败"));
    loadLogs(1);
  }, [loadLogs]);

  async function resetTotal() {
    if (!window.confirm("确认将系统累计使用次数重置为 0？")) return;
    await fetch("/api/admin/reset-total", { method: "POST" });
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats);
  }

  const pageSize = 10;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {error && <p className="text-red-400">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="今日聊天次数" value={stats ? String(stats.todayCount) : "-"} />
        <StatCard label="今日使用 IP 数" value={stats ? String(stats.todayIpCount) : "-"} />
        <StatCard
          label="系统累计 / 上限"
          value={stats ? `${stats.totalUsed} / ${stats.totalLimit}` : "-"}
        />
        <StatCard label="累计访客 IP 数" value={stats ? String(stats.visitorCount) : "-"} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">大模型调用日志</h2>
        <div className="flex items-center gap-2">
          <input
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                setAppliedIp(ipFilter.trim());
                loadLogs(1, ipFilter.trim());
              }
            }}
            placeholder="按 IP 筛选"
            className="w-36 rounded border border-white/15 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-red-500"
          />
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setAppliedIp(ipFilter.trim());
              loadLogs(1, ipFilter.trim());
            }}
            className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
          >
            查询
          </button>
          {appliedIp && (
            <button
              type="button"
              onClick={() => {
                setIpFilter("");
                setAppliedIp("");
                setPage(1);
                loadLogs(1, "");
              }}
              className="text-sm text-white/50 underline"
            >
              清除
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={resetTotal}
          className="rounded bg-amber-500/20 px-3 py-1.5 text-sm text-amber-300"
        >
          重置系统累计次数
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/10 text-white/70">
            <tr>
              <th className="px-3 py-2 font-normal">时间</th>
              <th className="px-3 py-2 font-normal">IP</th>
              <th className="px-3 py-2 font-normal">问题</th>
              <th className="px-3 py-2 font-normal">回复</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-white/5">
                <td className="whitespace-nowrap px-3 py-2 text-white/60">
                  {new Date(l.created_at).toLocaleString("zh-CN", { hour12: false })}
                </td>
                <td className="px-3 py-2 text-white/60">{l.ip}</td>
                <td className="max-w-[180px] truncate px-3 py-2">{l.question}</td>
                <td className="max-w-[240px] truncate px-3 py-2 text-white/70">{l.answer}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-white/40">
                  暂无日志
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3 text-sm">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => {
            const p = page - 1;
            setPage(p);
            loadLogs(p, appliedIp);
          }}
          className="rounded bg-white/10 px-3 py-1 disabled:opacity-40"
        >
          上一页
        </button>
        <span className="text-white/60">
          {page} / {maxPage}
        </span>
        <button
          type="button"
          disabled={page >= maxPage}
          onClick={() => {
            const p = page + 1;
            setPage(p);
            loadLogs(p, appliedIp);
          }}
          className="rounded bg-white/10 px-3 py-1 disabled:opacity-40"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function AdminHomePage() {
  return (
    <AdminShell title="仪表盘">
      <Dashboard />
    </AdminShell>
  );
}
