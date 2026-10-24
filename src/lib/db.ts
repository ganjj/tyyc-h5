import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface LotteryRow {
  id: number;
  name: string;
  year: string;
  match_time: string;
  hit_rate: string;
  content_html: string;
  footer_text: string;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface ChatLogRow {
  id: number;
  ip: string;
  question: string;
  answer: string;
  model: string;
  created_at: string;
}

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "tyyc.db");

export function resolveDbPath(): string {
  return process.env.DATABASE_PATH || DEFAULT_DB_PATH;
}

const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS lotteries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  year TEXT NOT NULL DEFAULT '',
  match_time TEXT NOT NULL DEFAULT '',
  hit_rate TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  footer_text TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS chat_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'qwen-plus',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_logs_ip_time ON chat_logs(ip, created_at);
CREATE TABLE IF NOT EXISTS visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL UNIQUE,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const DEFAULT_SETTINGS: Record<string, string> = {
  home_notice:
    "本平台数据仅供娱乐参考，不构成任何投注建议，请理性购彩。",
  mask_image: "",
  service_wechat1: "顶呱呱客服",
  service_wechat2: "",
  service_qq: "",
  service_notice: "联系客服，获取每日推荐与使用权限",
  service_qr_1: "",
  service_qr_2: "",
  service_qr_3: "",
  service_email_1: "kefu@dingguagua.com",
  service_email_2: "vip@dingguagua.com",
  service_email_3: "support@dingguagua.com",
  lottery_footer_text: "联系客服获取访问权限",
  chat_total_limit: "1000",
  chat_total_used: "0",
};

const SAMPLE_LOTTERIES: Array<
  Pick<LotteryRow, "name" | "year" | "hit_rate" | "content_html" | "footer_text" | "sort">
> = [
  {
    name: "巅峰方案",
    year: "2026",
    hit_rate: "10中7",
    sort: 1,
    content_html:
      "<p>本方案聚焦周末五大联赛焦点场次，采用多维度数据模型综合研判。</p><p>近期状态稳定，命中率 10 中 7，适合稳健参考。</p>",
    footer_text: "联系客服获取访问权限",
  },
  {
    name: "黄金方案",
    year: "2026",
    hit_rate: "15中10",
    sort: 2,
    content_html:
      "<p>精选每日高价值场次，结合欧亚指数与基本面交叉验证。</p><p>命中率 15 中 10，攻守均衡。</p>",
    footer_text: "联系客服获取访问权限",
  },
  {
    name: "钻石方案",
    year: "2026",
    hit_rate: "10中8",
    sort: 3,
    content_html:
      "<p>聚焦高热度场次，短线出击，快节奏推送。</p><p>命中率 10 中 8，适合高风险偏好用户。</p>",
    footer_text: "联系客服获取访问权限",
  },
];

function migrate(db: DatabaseSync) {
  db.exec(MIGRATIONS);
}

export interface DatabaseOptions {
  seed?: boolean;
}

export function openDatabase(filePath: string, options: DatabaseOptions = {}): DatabaseSync {
  if (filePath !== ":memory:") {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const db = new DatabaseSync(filePath);
  db.exec("PRAGMA journal_mode = WAL;");
  migrate(db);
  if (options.seed !== false) {
    seed(db);
  }
  return db;
}

// ---------- 密码哈希（scrypt，无外部依赖） ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ---------- settings ----------
export function getSetting(db: DatabaseSync, key: string, fallback = ""): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row ? row.value : fallback;
}

export function setSetting(db: DatabaseSync, key: string, value: string) {
  db.prepare(
    "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

export function getAllPublicSettings(db: DatabaseSync): Record<string, string> {
  const rows = db.prepare("SELECT key, value FROM settings").all() as Array<{
    key: string;
    value: string;
  }>;
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.key === "auth_secret") continue; // 内部密钥不对外暴露
    out[r.key] = r.value;
  }
  return out;
}

// ---------- seed ----------
function seed(db: DatabaseSync) {
  const userCount = (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
  if (userCount === 0) {
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || "admin123";
    db.prepare("INSERT INTO users(username, password_hash) VALUES (?, ?)").run(
      "admin",
      hashPassword(initialPassword)
    );
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const exists = db.prepare("SELECT 1 FROM settings WHERE key = ?").get(key);
    if (!exists) db.prepare("INSERT INTO settings(key, value) VALUES (?, ?)").run(key, value);
  }

  // 会话签名密钥仅存在数据库，保证重启后会话仍有效
  const secret = getSetting(db, "auth_secret", "");
  if (!secret) setSetting(db, "auth_secret", randomBytes(32).toString("hex"));

  const lotteryCount = (db.prepare("SELECT COUNT(*) AS c FROM lotteries").get() as { c: number }).c;
  if (lotteryCount === 0) {
    const insert = db.prepare(
      "INSERT INTO lotteries(name, year, hit_rate, content_html, footer_text, sort) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const l of SAMPLE_LOTTERIES) {
      insert.run(l.name, l.year, l.hit_rate, l.content_html, l.footer_text, l.sort);
    }
  }
}

// ---------- 应用级单例 ----------
const globalForDb = globalThis as unknown as { __tyycDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalForDb.__tyycDb) {
    globalForDb.__tyycDb = openDatabase(resolveDbPath());
  }
  return globalForDb.__tyycDb;
}
