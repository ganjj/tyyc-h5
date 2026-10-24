"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useRequireAdmin() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("admin");

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/me")
      .then(async (r) => {
        if (!r.ok) {
          if (alive) router.replace("/admin/login");
          return;
        }
        const d = (await r.json()) as { username?: string };
        if (alive) {
          setUsername(d.username || "admin");
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) router.replace("/admin/login");
      });
    return () => {
      alive = false;
    };
  }, [router]);

  return { ready, username };
}

export function AdminShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { ready, username } = useRequireAdmin();
  const pathname = usePathname();
  const router = useRouter();

  if (!ready) {
    return <div className="p-10 text-center text-white/60">加载中…</div>;
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.replace("/admin/login");
  }

  const nav = [
    { href: "/admin", label: "仪表盘" },
    { href: "/admin/lottery", label: "彩票管理" },
    { href: "/admin/settings", label: "系统设置" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1220] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h1 className="text-lg font-bold">管理后台 · {title}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60">{username}</span>
          <button
            type="button"
            onClick={logout}
            className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
          >
            退出
          </button>
        </div>
      </header>
      <div className="flex flex-col sm:flex-row">
        <nav className="flex gap-1 border-b border-white/10 p-3 sm:w-40 sm:flex-col sm:border-b-0 sm:border-r">
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={
                  active
                    ? "rounded bg-red-600 px-3 py-2 text-sm"
                    : "rounded px-3 py-2 text-sm text-white/70 hover:bg-white/10"
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
