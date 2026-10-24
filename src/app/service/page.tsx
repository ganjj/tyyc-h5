import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { getDb, getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ServicePage() {
  const db = getDb();
  const notice = getSetting(db, "service_notice", "联系客服，获取每日推荐与使用权限");
  const qrs = [
    getSetting(db, "service_qr_1", ""),
    getSetting(db, "service_qr_2", ""),
    getSetting(db, "service_qr_3", ""),
  ].filter(Boolean) as string[];
  const emails = [
    getSetting(db, "service_email_1", ""),
    getSetting(db, "service_email_2", ""),
    getSetting(db, "service_email_3", ""),
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gradient-to-b from-[#eaf3ff] via-white to-[#f5f8ff] pb-16">
      <header className="relative px-4 py-5 text-center">
        <Link
          href="/"
          className="absolute left-4 top-6 text-sm text-slate-500"
          aria-label="返回首页"
        >
          ← 返回
        </Link>
        <h1 className="text-2xl font-black text-[#1e6fd9]">联系客服</h1>
        <p className="mt-2 text-sm text-slate-400">扫码添加客服或发邮件获取完整方案</p>
      </header>

      <main className="px-4">
        {/* 引导文案 */}
        <div className="rounded-2xl border border-[#dceaff] bg-white px-4 py-3 text-center text-sm text-[#1e6fd9] shadow-[0_8px_24px_rgba(47,128,237,0.12)]">
          {notice}
        </div>

        {/* 二维码展示：1 个居中，2-3 个并排，高度不变，自动缩小 */}
        <section className="mt-5">
          <h2 className="mb-3 text-sm font-bold text-slate-700">客服二维码</h2>
          <div className="flex h-[200px] items-center justify-center gap-3">
            {qrs.length === 0
              ? [0, 1].map((i) => (
                  <div
                    key={`qr-placeholder-${i}`}
                    className="flex aspect-square max-w-[200px] min-w-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[#b9d4f5] bg-white text-slate-400"
                  >
                    <span className="text-3xl">📱</span>
                    <span className="mt-2 text-xs">二维码待上传</span>
                  </div>
                ))
              : (
              qrs.map((q, i) => (
                <div
                  key={`${q}-${i}`}
                  className="aspect-square min-w-0 max-w-[200px] flex-1 overflow-hidden rounded-2xl border border-[#dceaff] bg-white shadow-[0_6px_18px_rgba(47,128,237,0.12)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={q} alt={`客服二维码 ${i + 1}`} className="h-full w-full object-contain" />
                </div>
              ))
          )}
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">微信扫码添加，备注“足球大模型”</p>
        </section>

        {/* 邮箱列表 */}
        <section className="mt-7">
          <h2 className="mb-3 text-sm font-bold text-slate-700">客服邮箱</h2>
          <div className="overflow-hidden rounded-2xl border border-[#dceaff] bg-white shadow-[0_8px_24px_rgba(47,128,237,0.10)]">
            {emails.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">邮箱暂未配置</div>
            ) : (
              emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center gap-3 border-b border-[#f0f6ff] px-4 py-3 last:border-b-0"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf3ff] text-[#1e6fd9]">
                    <svg
                      className="h-4.5 w-4.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-10 6L2 7" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{email}</p>
                  </div>
                  <CopyButton text={email} />
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
