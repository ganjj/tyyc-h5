# 顶呱呱足球大模型（足彩引流 H5）

移动端 H5 引流页面 + 千问大模型咨询 + 管理后台。目标是引导访客点击客服、添加联系方式；
访客无需注册登录，系统只记录公网 IP 用于计次与去重统计。

## 技术栈
- Next.js 15（App Router）+ TypeScript + Tailwind CSS 4
- SQLite（Node 内置 `node:sqlite`，无原生依赖、无需编译）
- 千问 `qwen-plus`（阿里云百炼 DashScope OpenAI 兼容接口，内置 `fetch` 直连）
- 管理员密码使用 Node 内置 `crypto.scrypt` 哈希
- 测试使用 Node 内置 `node:test`（`tsc` 编译后运行，无需额外依赖）

## 本地运行
```bash
pnpm install
cp .env.example .env.local   # 填入 DASHSCOPE_API_KEY
pnpm dev                      # http://localhost:3000
```

首次启动会自动创建 `data/tyyc.db`、初始化管理员与示例方案。

## 页面
| 路径 | 说明 |
| --- | --- |
| `/` | 首页：滚动声明、标题、蒙版入口、命中率列表、客服浮标 |
| `/chat` | 大模型咨询（单 IP 当日 3 次，系统累计 1000 次） |
| `/lottery/[id]` | 方案详情：名称/年份/时间/命中率 + 图文 + 底部引流文案 |
| `/service` | 客服展示页（微信号/QQ + 一键复制） |
| `/admin/login` | 后台登录（默认 `admin` / `admin123`，登录后请立即改密） |
| `/admin` | 仪表盘：调用统计、日志（可按 IP 筛选）、重置累计次数 |
| `/admin/lottery` | 方案增删改 + 详情图上传 |
| `/admin/settings` | 首页声明/蒙版图/客服信息/总量上限/改密 |

## 限额规则
- **单 IP 当日 3 次**：按 `Asia/Shanghai` 自然日统计（每次 0 点自动归零，无需定时任务）。
- **系统总量 1000 次（累计）**：不自动重置，达到后任何提问统一返回“当前服务繁忙，请联系客服”，
  仅在后台“重置系统累计次数”后恢复。
- 只有**模型调用成功**才落日志并 +1；调用失败不消耗额度。
- 落库与计数在 `BEGIN IMMEDIATE` 事务内二次校验，并发下不会超发。

## 环境变量
| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DASHSCOPE_API_KEY` | 是 | 阿里云百炼 API Key（缺失时聊天返回“当前服务繁忙”） |
| `DASHSCOPE_MODEL` | 否 | 默认 `qwen-plus` |
| `DASHSCOPE_BASE_URL` | 否 | OpenAI 兼容接口地址 |
| `ADMIN_INITIAL_PASSWORD` | 否 | 首次初始化管理员密码，默认 `admin123` |
| `DATABASE_PATH` | 否 | SQLite 文件路径，默认 `data/tyyc.db` |

## 测试
```bash
pnpm test
```
覆盖：输入宽度校验（20 汉字 / 40 英文 / 混合）、IP 解析、北京时间自然日边界、
单 IP 当日 3 次边界、系统累计 1000 次拦截、登录限流、`/api/chat` 全链路（模拟千问返回）。

## 部署
1. `pnpm build && pnpm start`（建议 PM2 守护，Node 20+）。
2. Nginx 反代 **必须覆盖** 客户端可伪造的转发头，否则单 IP 次数限制可被绕过：
   ```nginx
   location / {
     proxy_pass http://127.0.0.1:3000;
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
     proxy_set_header X-Forwarded-For $remote_addr;   # 覆盖而非追加，防止伪造
     proxy_set_header X-Forwarded-Proto $scheme;
     client_max_body_size 10m;                         # 后台图片上传
   }
   ```
3. 页面需 HTTPS（微信内打开要求）。
4. `public/uploads/` 与 `data/` 需可写且持久化；备份 `data/tyyc.db` 即可备份全部数据。

## 安全说明
- 管理端会话为 HMAC 签名的 httpOnly Cookie（7 天），签名密钥随机生成并存于数据库。
- 登录接口有进程内限流（同一 IP 10 分钟内 10 次失败）；多实例部署需换成 Redis。
- 详情页 `content_html` 由后台录入并原样渲染，仅管理员可写；不要授予不可信人员后台账号。
