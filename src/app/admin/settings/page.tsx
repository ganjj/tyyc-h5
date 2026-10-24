"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

interface Settings {
  home_notice: string;
  mask_image: string;
  service_wechat1: string;
  service_wechat2: string;
  service_qq: string;
  service_notice: string;
  service_qr_1: string;
  service_qr_2: string;
  service_qr_3: string;
  service_email_1: string;
  service_email_2: string;
  service_email_3: string;
  lottery_footer_text: string;
  chat_total_limit: string;
  chat_total_used?: string;
}

const DEFAULTS: Settings = {
  home_notice: "",
  mask_image: "",
  service_wechat1: "",
  service_wechat2: "",
  service_qq: "",
  service_notice: "",
  service_qr_1: "",
  service_qr_2: "",
  service_qr_3: "",
  service_email_1: "",
  service_email_2: "",
  service_email_3: "",
  lottery_footer_text: "",
  chat_total_limit: "1000",
};

function SettingsForm() {
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setForm((f) => ({ ...f, ...(d as Settings) })))
      .catch(() => setMsg("配置加载失败"));
  }, []);

  async function uploadImage(file: File, key: "mask_image" | "service_qr_1" | "service_qr_2" | "service_qr_3") {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const d = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !d.url) {
      setMsg(d.error || "上传失败");
      return;
    }
    setForm((f) => ({ ...f, [key]: d.url! }));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = (await res.json()) as { error?: string };
      setMsg(res.ok ? "保存成功" : d.error || "保存失败");
    } catch {
      setMsg("网络异常");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPwdMsg("");
    if (!oldPassword || !newPassword) {
      setPwdMsg("请输入原密码和新密码");
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg("新密码至少 6 位");
      return;
    }
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const d = (await res.json()) as { error?: string };
    if (res.ok) {
      setPwdMsg("密码修改成功");
      setOldPassword("");
      setNewPassword("");
    } else {
      setPwdMsg(d.error || "修改失败");
    }
  }

  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
        <h2 className="font-medium">首页与引流配置</h2>

        <Field label="首页滚动声明">
          <textarea
            value={form.home_notice}
            onChange={set("home_notice")}
            rows={2}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
          />
        </Field>

        <Field label="首页蒙版图（空则显示占位）">
          <div className="flex items-center gap-2">
            <input
              value={form.mask_image}
              onChange={set("mask_image")}
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
            />
            <label className="shrink-0 cursor-pointer rounded bg-white/10 px-3 py-2 text-sm">
              上传
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f, "mask_image");
                }}
              />
            </label>
          </div>
          {form.mask_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.mask_image} alt="蒙版预览" className="mt-2 max-h-32 rounded" />
          )}
        </Field>

        <Field label="客服微信 1">
          <input value={form.service_wechat1} onChange={set("service_wechat1")} className={inputCls} />
        </Field>
        <Field label="客服微信 2">
          <input value={form.service_wechat2} onChange={set("service_wechat2")} className={inputCls} />
        </Field>
        <Field label="客服 QQ">
          <input value={form.service_qq} onChange={set("service_qq")} className={inputCls} />
        </Field>
        {(["1", "2", "3"] as const).map((n) => {
          const key = `service_qr_${n}` as "service_qr_1" | "service_qr_2" | "service_qr_3";
          const value = form[key];
          return (
            <Field key={key} label={`客服二维码 ${n}（最多展示 3 个，留空不显示）`}>
              <div className="flex items-center gap-2">
                <input
                  value={value}
                  onChange={set(key)}
                  className={inputCls}
                  placeholder="/uploads/xxx.png"
                />
                <label className="shrink-0 cursor-pointer rounded bg-white/10 px-3 py-2 text-sm">
                  上传
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f, key);
                    }}
                  />
                </label>
              </div>
              {value && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={value} alt={`二维码${n}预览`} className="mt-2 max-h-24 rounded" />
              )}
            </Field>
          );
        })}
        {(["1", "2", "3"] as const).map((n) => {
          const key = `service_email_${n}` as
            | "service_email_1"
            | "service_email_2"
            | "service_email_3";
          return (
            <Field key={key} label={`客服邮箱 ${n}（留空不显示）`}>
              <input value={form[key]} onChange={set(key)} className={inputCls} placeholder="kefu@example.com" />
            </Field>
          );
        })}
        <Field label="客服页引导文案">
          <textarea
            value={form.service_notice}
            onChange={set("service_notice")}
            rows={2}
            className={inputCls}
          />
        </Field>
        <Field label="详情页底部引导文字">
          <input
            value={form.lottery_footer_text}
            onChange={set("lottery_footer_text")}
            className={inputCls}
          />
        </Field>

        <Field label="系统总聊天次数上限（累计不自动重置）">
          <input value={form.chat_total_limit} onChange={set("chat_total_limit")} className={inputCls} />
        </Field>
        {typeof form.chat_total_used !== "undefined" && (
          <p className="text-xs text-white/50">当前累计已用：{form.chat_total_used}</p>
        )}

        {msg && <p className="text-sm text-amber-300">{msg}</p>}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded bg-red-600 px-5 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存配置"}
        </button>
      </div>

      <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
        <h2 className="font-medium">修改登录密码</h2>
        <Field label="原密码">
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="新密码（至少 6 位）">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputCls}
          />
        </Field>
        {pwdMsg && <p className="text-sm text-amber-300">{pwdMsg}</p>}
        <button
          type="button"
          onClick={changePassword}
          className="rounded bg-white/10 px-5 py-2 text-sm"
        >
          修改密码
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-white/50">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function AdminSettingsPage() {
  return (
    <AdminShell title="系统设置">
      <SettingsForm />
    </AdminShell>
  );
}
