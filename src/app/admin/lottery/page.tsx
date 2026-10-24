"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

interface Lottery {
  id: number;
  name: string;
  year: string;
  match_time: string;
  hit_rate: string;
  content_html: string;
  footer_text: string;
  sort: number;
}

interface FormState {
  name: string;
  year: string;
  match_time: string;
  hit_rate: string;
  detail: string;
  imageUrl: string;
  footer_text: string;
  sort: number;
}

const EMPTY_FORM: FormState = {
  name: "",
  year: "",
  match_time: "",
  hit_rate: "",
  detail: "",
  imageUrl: "",
  footer_text: "",
  sort: 0,
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fieldsToHtml(detail: string, imageUrl: string): string {
  const paras = detail
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
  const img = imageUrl ? `<img src="${imageUrl}" alt="详情图" />` : "";
  return paras + img;
}

function htmlToFields(html: string): { detail: string; imageUrl: string } {
  const imgMatch = html.match(/<img[^>]+src="([^"]+)"/);
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<img[^>]+>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  const detail = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
  return { detail, imageUrl: imgMatch ? imgMatch[1] : "" };
}

function LotteryManager() {
  const [items, setItems] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Lottery | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/lotteries");
    if (res.ok) setItems((await res.json()) as Lottery[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function beginCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setMsg("");
  }

  function beginEdit(l: Lottery) {
    setEditing(l);
    const f = htmlToFields(l.content_html);
    setForm({
      name: l.name,
      year: l.year,
      match_time: l.match_time,
      hit_rate: l.hit_rate,
      detail: f.detail,
      imageUrl: f.imageUrl,
      footer_text: l.footer_text,
      sort: l.sort,
    });
    setMsg("");
  }

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const d = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !d.url) {
      setMsg(d.error || "上传失败");
      return;
    }
    setForm((f) => ({ ...f, imageUrl: d.url! }));
  }

  async function save() {
    if (!form.name.trim()) {
      setMsg("名称不能为空");
      return;
    }
    setBusy(true);
    setMsg("");
    const payload = {
      name: form.name.trim(),
      year: form.year.trim(),
      match_time: form.match_time.trim(),
      hit_rate: form.hit_rate.trim(),
      content_html: fieldsToHtml(form.detail, form.imageUrl.trim()),
      footer_text: form.footer_text,
      sort: Number(form.sort) || 0,
    };
    const res = editing
      ? await fetch(`/api/admin/lotteries/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/lotteries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json()) as { error?: string };
      setMsg(d.error || "保存失败");
      return;
    }
    setEditing(null);
    setForm(EMPTY_FORM);
    load();
  }

  async function remove(l: Lottery) {
    if (!window.confirm(`确认删除「${l.name}」？`)) return;
    await fetch(`/api/admin/lotteries/${l.id}`, { method: "DELETE" });
    load();
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">足彩方案列表</h2>
        <button
          type="button"
          onClick={beginCreate}
          className="rounded bg-red-600 px-4 py-1.5 text-sm"
        >
          + 新增方案
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-white/10 text-white/70">
            <tr>
              <th className="px-3 py-2 font-normal">名称</th>
              <th className="px-3 py-2 font-normal">年份</th>
              <th className="px-3 py-2 font-normal">时间</th>
              <th className="px-3 py-2 font-normal">命中率</th>
              <th className="px-3 py-2 font-normal">排序</th>
              <th className="px-3 py-2 font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-t border-white/5">
                <td className="px-3 py-2">{l.name}</td>
                <td className="px-3 py-2 text-white/60">{l.year}</td>
                <td className="px-3 py-2 text-white/60">{l.match_time || "-"}</td>
                <td className="px-3 py-2 text-red-400">{l.hit_rate}</td>
                <td className="px-3 py-2 text-white/60">{l.sort}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => beginEdit(l)} className="text-blue-400">
                    编辑
                  </button>
                  <button type="button" onClick={() => remove(l)} className="ml-3 text-red-400">
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-white/40">
                  暂无方案
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="font-medium">{editing ? `编辑方案 #${editing.id}` : "新增方案"}</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="名称 *">
            <Input value={form.name} onChange={set("name")} placeholder="如：巅峰方案" />
          </Field>
          <Field label="年份">
            <Input value={form.year} onChange={set("year")} placeholder="如：2026" />
          </Field>
          <Field label="时间">
            <Input value={form.match_time} onChange={set("match_time")} placeholder="如：2026-10-23" />
          </Field>
          <Field label="命中率">
            <Input value={form.hit_rate} onChange={set("hit_rate")} placeholder="如：10中7" />
          </Field>
          <Field label="排序">
            <Input type="number" value={String(form.sort)} onChange={set("sort")} placeholder="数字越小越靠前" />
          </Field>
          <Field label="底部引导文字">
            <Input value={form.footer_text} onChange={set("footer_text")} placeholder="默认：联系客服获取访问权限" />
          </Field>
        </div>

        <div className="mt-3">
          <p className="text-xs text-white/50">详情内容（每行一段）</p>
          <textarea
            value={form.detail}
            onChange={set("detail")}
            rows={5}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
            placeholder={"第一段详情\n第二段详情"}
          />
        </div>

        <div className="mt-3">
          <p className="text-xs text-white/50">详情图片</p>
          <div className="mt-1 flex items-center gap-2">
            <Input
              value={form.imageUrl}
              onChange={set("imageUrl")}
              placeholder="图片 URL，可点右侧上传"
            />
            <label className="shrink-0 cursor-pointer rounded bg-white/10 px-3 py-2 text-sm">
              上传
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f);
                }}
              />
            </label>
          </div>
          {form.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.imageUrl} alt="预览" className="mt-2 max-h-40 rounded" />
          )}
        </div>

        {msg && <p className="mt-3 text-sm text-amber-300">{msg}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded bg-red-600 px-5 py-2 text-sm disabled:opacity-50"
          >
            {busy ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(EMPTY_FORM);
              setMsg("");
            }}
            className="rounded bg-white/10 px-5 py-2 text-sm"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-white/50">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
    />
  );
}

export default function AdminLotteryPage() {
  return (
    <AdminShell title="彩票管理">
      <LotteryManager />
    </AdminShell>
  );
}
