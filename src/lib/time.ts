/** 北京时间（Asia/Shanghai，固定 UTC+8，无夏令时）自然日的起止 ISO 时间。 */
export function beijingDayRange(now: Date = new Date()): {
  startIso: string;
  endIso: string;
  date: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  let year = 1970;
  let month = 1;
  let day = 1;
  for (const p of parts) {
    if (p.type === "year") year = Number(p.value);
    if (p.type === "month") month = Number(p.value);
    if (p.type === "day") day = Number(p.value);
  }

  const start = new Date(Date.UTC(year, month - 1, day) - 8 * 3600 * 1000);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { startIso: start.toISOString(), endIso: end.toISOString(), date };
}
