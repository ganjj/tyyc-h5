"use client";

import { useEffect, useRef, useState } from "react";

const BANNERS = [
  {
    src: "/banners/banner-1.jpg",
    title: "AI 数据模型",
    desc: "多维度赛事数据 · 每日精选参考",
  },
  {
    src: "/banners/banner-2.jpg",
    title: "顶呱呱大模型",
    desc: "免费体验 AI 智能问答",
  },
  {
    src: "/banners/banner-3.jpg",
    title: "专业赛事分析",
    desc: "五大联赛 · 世预赛全覆盖",
  },
];

const AUTO_PLAY_MS = 3500;

export function BannerCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const autoRef = useRef(true);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef({ dragging: false, startX: 0, scrollLeft: 0 });
  const [active, setActive] = useState(0);

  function goTo(index: number, behavior: ScrollBehavior = "smooth") {
    const el = trackRef.current;
    if (!el) return;
    const next = (index + BANNERS.length) % BANNERS.length;
    el.scrollTo({ left: next * el.clientWidth, behavior });
  }

  // 每 3.5 秒自动切换到下一张
  useEffect(() => {
    const timer = setInterval(() => {
      if (autoRef.current && !drag.current.dragging) {
        goTo(activeRef.current + 1);
      }
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
    };
  }, []);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.clientWidth > 0) {
      const next = Math.round(el.scrollLeft / el.clientWidth);
      activeRef.current = next;
      setActive(next);
    }
  }

  // 手动操作后暂停自动轮播，停止操作 8 秒后恢复
  function pauseAutoplay() {
    autoRef.current = false;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      autoRef.current = true;
    }, 8000);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el) return;
    pauseAutoplay();
    drag.current = { dragging: true, startX: e.clientX, scrollLeft: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el || !drag.current.dragging) return;
    el.scrollLeft = drag.current.scrollLeft - (e.clientX - drag.current.startX);
  }

  function endDrag() {
    if (!drag.current.dragging) return;
    drag.current.dragging = false;
    const el = trackRef.current;
    if (el && el.clientWidth > 0) {
      goTo(Math.round(el.scrollLeft / el.clientWidth));
    }
  }

  // 桌面端滚轮横向滚动
  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    pauseAutoplay();
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => {
      const el = trackRef.current;
      if (el && el.clientWidth > 0) goTo(Math.round(el.scrollLeft / el.clientWidth));
    }, 120);
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="no-scrollbar flex cursor-grab snap-x snap-mandatory overflow-x-auto scroll-smooth pt-4 select-none active:cursor-grabbing"
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onWheel={handleWheel}
      >
        {BANNERS.map((b, i) => (
          <div
            key={b.src}
            className={
              "relative h-[150px] shrink-0 snap-start overflow-hidden rounded-2xl shadow-[0_10px_30px_rgba(47,128,237,0.18)] " +
              (i === 0 ? "ml-4" : "ml-3") +
              (i === BANNERS.length - 1 ? " mr-4" : "")
            }
            style={{ width: "calc(100% - 3rem)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.src}
              alt={b.title}
              draggable={false}
              className="pointer-events-none h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1e6fd9]/75 via-[#1e6fd9]/30 to-transparent" />
            <div className="pointer-events-none absolute bottom-4 left-4 text-white">
              <p className="text-base font-bold drop-shadow">{b.title}</p>
              <p className="mt-1 text-xs opacity-90">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-9 flex gap-1.5">
        {BANNERS.map((b, i) => (
          <span
            key={b.src}
            className={
              "h-1.5 rounded-full transition-all duration-300 " +
              (i === active ? "w-4 bg-white" : "w-1.5 bg-white/60")
            }
          />
        ))}
      </div>
    </div>
  );
}
