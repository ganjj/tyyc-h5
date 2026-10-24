import Link from "next/link";

export function FloatingService() {
  return (
    <Link
      href="/service"
      className="fixed right-3 bottom-28 z-50 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#2f80ed] to-[#1e6fd9] text-white shadow-lg shadow-[#1e6fd9]/40 transition-transform duration-200 active:scale-95"
      aria-label="联系客服"
    >
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.2 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.3A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3a8.38 8.38 0 0 1 8.5 8.5z" />
      </svg>
      <span className="text-xs leading-none">客服</span>
    </Link>
  );
}
