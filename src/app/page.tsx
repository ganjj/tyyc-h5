import Link from "next/link";
import { Marquee } from "@/components/Marquee";
import { BannerCarousel } from "@/components/BannerCarousel";
import { VisitTracker } from "@/components/VisitTracker";
import { FloatingService } from "@/components/FloatingService";
import { getDb, getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface LotteryListItem {
  id: number;
  name: string;
  hit_rate: string;
}

export default function HomePage() {
  const db = getDb();
  const notice = getSetting(db, "home_notice", "本平台数据仅供娱乐参考，请理性购彩。");
  const maskImage = getSetting(db, "mask_image", "");
  const lotteries = db
    .prepare("SELECT id, name, hit_rate FROM lotteries ORDER BY sort ASC, id DESC")
    .all() as unknown as LotteryListItem[];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gradient-to-b from-[#eaf3ff] via-white to-[#f5f8ff]">
      {/* 顶部滚动声明 */}
      <div className="flex items-center bg-gradient-to-r from-[#1e6fd9] via-[#3d87ea] to-[#1e6fd9] text-white">
        <span className="flex h-8 shrink-0 items-center gap-1 border-r border-white/25 bg-[#175bb8] px-2 text-xs font-medium">
          声明提示
        </span>
        <div className="min-w-0 flex-1 overflow-hidden text-sm">
          <Marquee text={notice} />
        </div>
      </div>

      {/* 可滑动 Banner */}
      <BannerCarousel />

      {/* 标题 */}
      <header className="px-4 pb-2 pt-6 text-center">
        <h1 className="bg-gradient-to-b from-[#1e6fd9] to-[#6aaaf5] bg-clip-text text-3xl font-black tracking-wide text-transparent">
          顶呱呱足球大模型
        </h1>
        <p className="mt-2 text-xs text-slate-400">AI 数据模型 · 每日精选参考</p>
      </header>

      {/* 蒙版入口图 */}
      <section className="px-4 pt-2">
        <Link
          href="/chat"
          className="block overflow-hidden rounded-2xl border border-[#dceaff] bg-white shadow-[0_10px_30px_rgba(47,128,237,0.14)] transition-transform duration-200 active:scale-[0.99]"
        >
          {maskImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={maskImage} alt="点击进入 AI 咨询" className="h-48 w-full object-cover" />
          ) : (
            <div className="flex h-48 w-full flex-col items-center justify-center bg-gradient-to-br from-[#eaf3ff] to-white">
              <span className="text-4xl">⚽</span>
              <span className="mt-3 text-lg font-bold text-[#1e6fd9]">点击进入 AI 咨询</span>
              <span className="mt-1 text-xs text-slate-400">免费体验顶呱呱足球大模型</span>
            </div>
          )}
        </Link>
      </section>

      {/* 信息列表 */}
      <section className="px-4 pb-32 pt-6">
        <div className="overflow-hidden rounded-2xl border border-[#dceaff] bg-white shadow-[0_8px_24px_rgba(47,128,237,0.10)]">
          <div className="grid grid-cols-[1fr_6rem] border-b border-[#cfe0f5] bg-[#eaf3ff]">
            <div className="py-2 text-center text-sm font-bold text-[#1e6fd9]">名称</div>
            <div className="py-2 text-center text-sm font-bold text-[#1e6fd9]">命中率</div>
          </div>
          {lotteries.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">暂无数据</div>
          )}
          {lotteries.map((l, i) => (
            <Link
              key={l.id}
              href={`/lottery/${l.id}`}
              className={
                "grid grid-cols-[1fr_6rem] items-center border-b border-[#dbe9fa] transition-colors last:border-b-0 active:bg-[#dcecff] " +
                (i % 2 === 0 ? "bg-white" : "bg-[#eef5ff]")
              }
            >
              <span className="truncate border-r border-[#cfe0f5] px-4 py-3 text-sm text-slate-800">
                {l.name}
              </span>
              <span className="px-2 py-3 text-center text-sm font-medium text-[#1e6fd9]">
                {l.hit_rate}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <FloatingService />
      <VisitTracker />
    </div>
  );
}
