import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // 关闭开发模式左下角的 Next.js 悬浮指示器（那个 N 图标）
  devIndicators: false,
};

export default nextConfig;
