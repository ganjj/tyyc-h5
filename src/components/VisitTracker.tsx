"use client";

import { useEffect } from "react";

/** 进入页面时上报访客公网 IP（仅用于去重统计，不上传任何个人信息）。 */
export function VisitTracker() {
  useEffect(() => {
    fetch("/api/visit", { method: "POST", keepalive: true }).catch(() => {});
  }, []);
  return null;
}
