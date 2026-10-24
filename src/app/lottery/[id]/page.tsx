import Link from "next/link";
import { notFound } from "next/navigation";
import { FloatingService } from "@/components/FloatingService";
import { getDb, getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LotteryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, name, year, match_time, hit_rate, content_html, footer_text FROM lotteries WHERE id = ?"
    )
    .get(Number(id)) as
    | {
        id: number;
        name: string;
        year: string;
        match_time: string;
        hit_rate: string;
        content_html: string;
        footer_text: string;
      }
    | undefined;

  if (!row) {
    notFound();
  }

  const footerText = row.footer_text || getSetting(db, "lottery_footer_text", "联系客服获取访问权限");

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gradient-to-b from-[#eaf3ff] via-white to-[#f5f8ff] pb-32">
      <header className="flex items-center gap-2 px-4 py-4">
        <Link href="/" className="text-sm text-slate-500" aria-label="返回首页">
          ← 返回
        </Link>
      </header>

      <div className="px-4">
        <h1 className="text-2xl font-black text-slate-900">{row.name}</h1>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-[#e4efff] bg-white px-2 py-2 shadow-[0_4px_14px_rgba(47,128,237,0.08)]">
            <p className="text-[10px] text-slate-400">年份</p>
            <p className="mt-0.5 text-sm text-slate-800">{row.year || "-"}</p>
          </div>
          <div className="rounded-xl border border-[#e4efff] bg-white px-2 py-2 shadow-[0_4px_14px_rgba(47,128,237,0.08)]">
            <p className="text-[10px] text-slate-400">时间</p>
            <p className="mt-0.5 text-sm text-slate-800">{row.match_time || "-"}</p>
          </div>
          <div className="rounded-xl border border-[#e4efff] bg-white px-2 py-2 shadow-[0_4px_14px_rgba(47,128,237,0.08)]">
            <p className="text-[10px] text-slate-400">命中率</p>
            <p className="mt-0.5 text-sm font-medium text-[#1e6fd9]">{row.hit_rate || "-"}</p>
          </div>
        </div>
      </div>

      {/* 详情图文 */}
      <article className="px-4 pt-5">
        <div
          className="content-html rounded-2xl border border-[#e4efff] bg-white p-4 text-sm leading-6 text-slate-700 shadow-[0_8px_24px_rgba(47,128,237,0.10)]"
          dangerouslySetInnerHTML={{ __html: row.content_html }}
        />
      </article>

      {/* 底部引导文字 */}
      <div className="fixed inset-x-0 bottom-0 border-t border-[#e4efff] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <p className="text-sm text-[#1e6fd9]">{footerText}</p>
          <Link
            href="/service"
            className="rounded-full bg-gradient-to-r from-[#2f80ed] to-[#1e6fd9] px-4 py-2 text-sm font-medium text-white shadow-[0_4px_12px_rgba(47,128,237,0.30)] transition-transform active:scale-95"
          >
            联系客服
          </Link>
        </div>
      </div>

      <FloatingService />
    </div>
  );
}
