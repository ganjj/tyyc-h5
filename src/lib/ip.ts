/**
 * 获取访客公网 IP。部署在 Nginx 后时，由 Nginx 传递真实 IP；
 * 优先 x-forwarded-for 首个地址，其次 x-real-ip / cf-connecting-ip，再次 NextRequest.ip。
 */
export function getClientIp(req: {
  headers: Headers;
  ip?: string;
}): string {
  const ff = req.headers.get("x-forwarded-for");
  if (ff) {
    const first = ff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real && real.trim()) return real.trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();
  if (req.ip) return req.ip;
  return "unknown";
}
