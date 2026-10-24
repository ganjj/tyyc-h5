# AGENTS.MD

本文件记录当前项目（顶呱呱足球大模型 / 足彩引流 H5）的结构、约定与关键实现细节，供后续开发者与 AI Agent 快速上手。

## 1. 工作约定（必须遵守）

- 修改 JavaScript / TypeScript 文件后必须运行 `npm test`。
- 安装 JS 依赖时优先使用 `pnpm`。
- 添加新的**生产依赖**前必须先询问并取得确认。
- 所有面向用户的文案使用中文；移动端优先。
- 不要提交或泄露 `.env.local`、`data/*.db`、`public/uploads/*` 中的真实数据。

## 2. 项目定位

这是一个移动端 H5 引流站点 + 千问大模型问答 + 管理后台：

- 访客无需注册登录，主要通过首页、方案详情页、客服页引导添加客服。
- 聊天页提供 AI 咨询，按公网 IP 和系统累计次数双重限流。
- 后台可维护足彩方案、首页/客服配置、查看调用日志、重置系统累计次数、修改密码。
- 仅记录公网 IP 用于计次与访客去重统计。

## 3. 技术栈与运行环境

| 项目 | 说明 |
| --- | --- |
| 框架 | Next.js 15（App Router）+ React 19 + TypeScript 5.9 |
| 样式 | Tailwind CSS 4（`@tailwindcss/postcss`，`globals.css` 中使用 `@import "tailwindcss"`） |
| 数据库 | SQLite，使用 Node 内置 `node:sqlite` 的 `DatabaseSync`，无原生依赖 |
| 大模型 | 阿里云百炼 DashScope OpenAI 兼容接口，默认 `qwen-plus`，使用内置 `fetch` |
| 鉴权 | HMAC-SHA256 签名 httpOnly Cookie，密码使用 Node `crypto.scrypt` |
| 测试 | Node 内置 `node:test`，先用 `tsc` 编译到 `.test-build` 再运行 |
| 包管理 | pnpm（当前环境 pnpm 11.25.0 / Node v26.8.2） |

注意：`node:sqlite` 需要较新的 Node 版本（Node 22.5+ 可用，当前环境 Node 26）。README 中“Node 20+”的表述偏旧，实际部署应以当前 Node LTS 且支持 `node:sqlite` 为准。

## 4. 常用命令

```bash
pnpm install       # 安装依赖
cp .env.example .env.local
pnpm dev           # 开发服务器 http://localhost:3000
pnpm build         # 生产构建
pnpm start         # 启动生产服务
npm test           # 类型检查 + 编译测试 + 运行 node:test
```

当前 `package.json` 没有 lint 脚本。测试实际执行：

```text
tsc -p tsconfig.test.json
node --require ./tests/alias-register.cjs --test .test-build/tests/
```

`tests/alias-register.cjs` 负责把源码中的 `@/xxx` 别名在测试运行时解析为 `.test-build/src/xxx`。

## 5. 目录结构

```text
src/
  app/
    page.tsx                     # 首页
    layout.tsx                   # 根布局、全局元信息
    globals.css                  # Tailwind、品牌色、跑马灯、详情 HTML 样式
    chat/page.tsx                # AI 咨询页
    lottery/[id]/page.tsx        # 方案详情页
    service/page.tsx             # 客服页
    admin/                       # 后台页面（全部为客户端组件）
      login/page.tsx
      page.tsx                   # 仪表盘 + 调用日志
      lottery/page.tsx           # 方案增删改 + 图片上传
      settings/page.tsx          # 站点配置 + 改密
    api/
      chat/route.ts              # GET 额度 / POST 提问
      visit/route.ts             # 访客 IP 上报
      lotteries/...              # 公开方案列表与详情
      admin/...                  # 后台登录、数据、上传等接口
  components/
    ChatPanel.tsx                # 聊天 UI 与前端校验
    BannerCarousel.tsx           # 首页 Banner 轮播
    Marquee.tsx                  # 顶部滚动声明
    FloatingService.tsx          # 悬浮客服按钮
    CopyButton.tsx               # 一键复制
    VisitTracker.tsx             # 页面访问上报
    admin/AdminShell.tsx         # 后台布局、登录态检查、导航、退出
  lib/
    db.ts                        # SQLite 连接、建表、种子数据、设置、密码哈希
    auth.ts                      # 管理端会话签发与校验
    admin-guard.ts               # 管理 API 鉴权包装
    ip.ts                        # 客户端 IP 解析
    quota.ts                     # 额度查询与拦截原因
    time.ts                      # 北京时间自然日范围
    validate.ts                  # 问题宽度校验与截断
    qwen.ts                      # 千问调用与系统提示词
    rate-limit.ts                # 进程内滑动窗口限流
tests/                           # node:test 测试
data/tyyc.db                     # 本地 SQLite（已 gitignore）
public/banners/                  # 首页静态 Banner 图
public/uploads/                  # 后台上传图片（保留 .gitkeep）
```

## 6. 页面与路由

| 路径 | 类型 | 说明 |
| --- | --- | --- |
| `/` | 服务端页面 | 顶部滚动声明、Banner 轮播、标题、蒙版入口图、方案命中率列表、悬浮客服、访问上报 |
| `/chat` | 服务端壳 + 客户端聊天 | 单 IP 每日 3 次、系统累计上限、输入宽度限制、剩余次数提示 |
| `/lottery/[id]` | 服务端页面 | 方案名称/年份/时间/命中率、`content_html` 图文、底部引流条、悬浮客服；不存在时 404 |
| `/service` | 服务端页面 | 客服引导文案、最多 3 个二维码（1 个居中、多个并排）、最多 3 个邮箱、复制按钮 |
| `/admin/login` | 客户端页面 | 管理员登录 |
| `/admin` | 客户端页面 | 今日聊天次数、今日 IP 数、累计使用/上限、累计访客 IP；日志表支持 IP 筛选与分页；可重置累计次数 |
| `/admin/lottery` | 客户端页面 | 方案列表、新增/编辑/删除、详情段落、详情图上传、排序 |
| `/admin/settings` | 客户端页面 | 首页声明、蒙版图、客服微信/QQ/二维码/邮箱、引导文案、总次数上限、改密 |

所有读取数据库的页面与 API 都显式声明 `dynamic = "force-dynamic"` 和 `runtime = "nodejs"`。

## 7. 数据库设计

数据库文件默认 `data/tyyc.db`，可用 `DATABASE_PATH` 覆盖；启动时自动建目录、建表、写入种子数据，并启用 `PRAGMA journal_mode = WAL`。

| 表 | 关键字段 | 用途 |
| --- | --- | --- |
| `users` | `id`, `username`(唯一), `password_hash`, `created_at` | 管理员账号，当前只有 `admin` |
| `lotteries` | `id`, `name`, `year`, `match_time`, `hit_rate`, `content_html`, `footer_text`, `sort`, `created_at`, `updated_at` | 足彩方案 |
| `chat_logs` | `id`, `ip`, `question`, `answer`, `model`, `created_at` | 成功的大模型调用日志，也是额度统计依据 |
| `visitors` | `ip`(唯一), `first_seen`, `last_seen`, `visits` | 访客去重与访问次数 |
| `settings` | `key`(主键), `value` | 站点配置、系统累计次数、`auth_secret` 等 |

实现要点：

- `getDb()` 通过 `globalThis.__tyycDb` 维持进程级单例，避免开发热更新重复建连。
- 首次初始化会创建管理员（默认 `admin` / `admin123`，可用 `ADMIN_INITIAL_PASSWORD` 覆盖）、写入默认设置、生成 `auth_secret`，并在方案表为空时插入 3 条示例方案。
- `getAllPublicSettings()` 会过滤 `auth_secret`，后台接口不会把它返回给前端。
- `chat_logs.created_at` 存 ISO 时间字符串（UTC）；`lotteries` 的时间字段由 SQLite `datetime('now')` 生成。
- `visitors` 通过 `ON CONFLICT(ip)` 更新 `last_seen` 并累加 `visits`。

## 8. 核心业务规则

### 8.1 问题输入限制

- 统一按“显示宽度”计算：中文、CJK 标点、全角字符、emoji 等按 2；英文/数字等按 1。
- 上限 `MAX_QUESTION_WIDTH = 40`，等价于 **20 个汉字或 40 个英文字符**。
- 前端会实时截断并显示 `当前宽度/40`；后端 `validateQuestion()` 再次校验并 trim，禁止空问题。
- 前后端共用 `src/lib/validate.ts`，修改规则时两边自动一致。

### 8.2 额度与限流

- **单 IP 每日 3 次**：按 `Asia/Shanghai` 自然日统计（0 点自动归零，无需定时任务）。
- **系统累计 1000 次**：由 `settings.chat_total_used` / `chat_total_limit` 控制，不自动重置；达到上限后返回“当前服务繁忙，请联系客服”。
- 只有模型调用成功才写入日志并累计 +1；模型失败不消耗额度。
- 写入日志和累计次数在 `BEGIN IMMEDIATE` 事务中完成，事务内会再次校验系统总量和单 IP 次数，避免并发超发。
- `parseLimit()`：空值或非法值回退为 1000；显式 `0` 表示关闭服务。
- `/api/chat` 的 `GET` 返回 `{ blocked, remaining }`，用于聊天页初始提示。
- 登录接口另有独立限流：同一 IP 10 分钟内最多 10 次尝试；成功后重置该 IP 的计数。限流是进程内 Map，多实例部署需替换为 Redis。

### 8.3 错误码与文案

| 场景 | HTTP | `code` / 响应 |
| --- | --- | --- |
| 系统累计用尽 | 429 | `busy`，`当前服务繁忙，请联系客服` |
| 单 IP 当日用尽 | 429 | `ip_limit`，`提示当日已达到使用上限，请联系客服即可` |
| 模型调用失败 | 502 | `model_error`，`当前服务繁忙，请联系客服` |
| 输入非法 / JSON 非法 | 400 | `{ error: ... }` |
| 未登录后台 | 401 | `{ error: "未登录" }` |

模型请求超时时间为 30 秒；未配置 `DASHSCOPE_API_KEY` 时直接视为调用失败。

### 8.4 公网 IP 解析

`getClientIp()` 的优先级：

1. `x-forwarded-for` 第一个地址（逗号分隔）
2. `x-real-ip`
3. `cf-connecting-ip`
4. `NextRequest.ip`
5. `"unknown"`

生产环境 Nginx **必须覆盖** `X-Forwarded-For`（`proxy_set_header X-Forwarded-For $remote_addr;`），不能追加，否则客户端可伪造 IP 绕过每日限制。

### 8.5 访问统计

`VisitTracker` 仅在首页和聊天页挂载，进入页面时 `POST /api/visit`；IP 为 `unknown` 时不记录。

## 9. 后台与安全

- 登录成功后写入 `tyyc_admin` Cookie：HMAC-SHA256 签名、httpOnly、`sameSite=lax`、7 天有效。
- 签名密钥随机生成并保存在 `settings.auth_secret`，数据库中缺少密钥会抛错。
- 所有后台 API 通过 `requireAdmin(req)` 校验 Cookie；后台页面在客户端调用 `/api/admin/me`，未登录时跳转 `/admin/login`。
- 当前没有 Next.js middleware；页面 HTML 本身不构成敏感数据，数据接口均受保护。
- 修改密码不会使已签发的旧会话失效（如需强制下线，需要额外机制）。
- 上传限制：仅 png/jpeg/gif/webp，单文件不超过 5MB，文件名由时间戳 + 随机串生成，保存到 `public/uploads/`。
- 方案详情 `content_html` 由后台录入并原样通过 `dangerouslySetInnerHTML` 渲染，仅管理员可写；不要给不可信人员后台账号。
- 生产必须使用 HTTPS（微信内打开要求）。

## 10. API 一览

### 公开接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/chat` | 当前 IP 是否被拦截、今日剩余次数 |
| `POST` | `/api/chat` | 提问；成功返回 `{ answer, remaining }` |
| `POST` | `/api/visit` | 记录访客 IP |
| `GET` | `/api/lotteries` | 方案列表（`id`, `name`, `year`, `hit_rate`），按 `sort ASC, id DESC` |
| `GET` | `/api/lotteries/[id]` | 方案详情，未找到返回 404 |

### 管理接口（均需登录）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/admin/login` | 登录并设置 Cookie，带 IP 限流 |
| `POST` | `/api/admin/logout` | 清除 Cookie |
| `GET` | `/api/admin/me` | 当前登录用户 |
| `GET` | `/api/admin/stats` | 累计使用/上限、今日次数、今日 IP 数、访客 IP 数 |
| `GET` | `/api/admin/logs` | 日志分页（`page`, `pageSize` 最大 100, `ip` 模糊筛选） |
| `POST` | `/api/admin/reset-total` | 将 `chat_total_used` 重置为 0 |
| `GET/PUT` | `/api/admin/settings` | 读取/更新白名单配置项 |
| `GET/POST` | `/api/admin/lotteries` | 方案列表 / 新建方案 |
| `PUT/DELETE` | `/api/admin/lotteries/[id]` | 更新 / 删除方案 |
| `POST` | `/api/admin/upload` | 图片上传，返回 `{ url: "/uploads/..." }` |
| `POST` | `/api/admin/change-password` | 校验原密码后修改，新密码至少 6 位 |

`PUT /api/admin/settings` 只接受白名单键：`home_notice`、`mask_image`、客服微信/QQ/二维码/邮箱、`service_notice`、`lottery_footer_text`、`chat_total_limit`。

## 11. 配置项（settings）

| 键 | 默认值 / 说明 |
| --- | --- |
| `home_notice` | 首页滚动声明，默认“本平台数据仅供娱乐参考，不构成任何投注建议，请理性购彩。” |
| `mask_image` | 首页蒙版入口图，空则显示占位块 |
| `service_wechat1/2` | 客服微信，默认 `service_wechat1 = 顶呱呱客服` |
| `service_qq` | 客服 QQ |
| `service_notice` | 客服页引导文案 |
| `service_qr_1/2/3` | 客服二维码，最多展示 3 个，空值不显示 |
| `service_email_1/2/3` | 客服邮箱，默认 3 个 `@dingguagua.com` 邮箱 |
| `lottery_footer_text` | 详情页默认底部引导文字，默认“联系客服获取访问权限” |
| `chat_total_limit` | 系统累计上限，默认 1000 |
| `chat_total_used` | 系统累计已用次数，仅由接口维护 |
| `auth_secret` | 会话签名密钥，不对外暴露 |

## 12. 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DASHSCOPE_API_KEY` | 是 | 缺失时聊天返回“当前服务繁忙” |
| `DASHSCOPE_MODEL` | 否 | 默认 `qwen-plus` |
| `DASHSCOPE_BASE_URL` | 否 | 默认 `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` |
| `ADMIN_INITIAL_PASSWORD` | 否 | 仅首次建库时生效，默认 `admin123` |
| `DATABASE_PATH` | 否 | SQLite 文件路径，默认 `data/tyyc.db` |

参考文件：`.env.example`。本地实际配置在 `.env.local`，不要读取或输出其中的密钥。

## 13. 前端约定

- 页面均为移动端优先，主体宽度 `max-w-md`，整体浅蓝品牌风。
- 品牌色定义在 `globals.css`：`--brand-primary: #1e6fd9`、`--brand-primary-deep: #175bb8`，常用渐变 `#2f80ed → #1e6fd9`。
- 后台为深色风格（`#0f1220`），强调色为红色。
- 图片使用原生 `<img>` 并配 `eslint-disable-next-line @next/next/no-img-element`；未使用 `next/image`。
- Banner 数据硬编码在 `BannerCarousel.tsx`，图片为 `public/banners/banner-1.jpg` ~ `banner-3.jpg`；自动轮播 3.5 秒，手动操作后暂停 8 秒。
- 悬浮客服按钮固定右下（`bottom-28`），指向 `/service`。
- 详情页富文本样式由 `.content-html` 控制（段落间距、图片最大宽度、圆角）。

## 14. 测试

```bash
npm test
```

覆盖范围：

- `validate.test.ts`：中文/英文/混合宽度、20 汉字与 40 字符边界、截断。
- `ip.test.ts`：各 IP 头优先级与回退。
- `time.test.ts`：北京时间自然日与 0 点边界。
- `quota.test.ts`：单 IP 每日 3 次、系统累计上限、`parseLimit` 回退。
- `rate-limit.test.ts`：登录限流窗口、过期重置、不同 key 隔离。
- `chat-route.test.ts`：`/api/chat` 全链路，模拟千问返回，验证额度与日志。
- `admin-flow.test.ts`：登录、会话、方案 CRUD、设置、重置累计、改密等后台流程。

测试会使用临时目录中的独立 SQLite 文件，不会污染 `data/tyyc.db`。新增测试放在 `tests/*.test.ts`，如需测试新的源码文件，要同步扩展 `tsconfig.test.json` 的 `include`。

## 15. 部署与运维

1. 配置 `.env.local`（或进程环境变量），执行 `pnpm build && pnpm start`。
2. 建议 Node 进程由 PM2 等守护；单实例部署可直接使用进程内限流。
3. Nginx 反向代理示例（关键是覆盖转发头）：

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $remote_addr;
  proxy_set_header X-Forwarded-Proto $scheme;
  client_max_body_size 10m;
}
```

4. `data/` 与 `public/uploads/` 必须可写并持久化；备份 `data/tyyc.db` 即可备份业务数据（WAL 模式下建议同时备份 `-wal` / `-shm` 或先做 checkpoint）。
5. 多实例部署时，登录限流、系统累计事务等需要改为共享存储/数据库方案。
6. 部署后立即修改默认管理员密码。

## 16. 已知注意事项 / 潜在改进点

- 每次改动完成后，都必须创建一个对应的 git commit，以便后续追踪和回滚。
- README 写“Node 20+”，但 `node:sqlite` 实际要求更高版本；以运行环境支持为准。
- `/api/chat` 写日志时 `model` 字段硬编码为 `'qwen-plus'`，即使通过 `DASHSCOPE_MODEL` 更换模型，日志仍显示 `qwen-plus`。
- 修改密码不会吊销现有会话；如需“改密即下线”，需要引入会话版本号或黑名单。
- 后台登录限流与访客统计都是进程内/单库实现，多实例下行为不一致。
- 项目根目录当前没有 `pnpm-lock.yaml`，依赖版本以 `node_modules` 实际安装为准；建议后续补锁文件。
- 根目录存在 `.next.bak-corrupt`、`.test-build`、`tsconfig.tsbuildinfo` 等本地产物，均不应作为源码修改或提交。
- 当前目录不是 Git 仓库（`git status` 不可用），提交前需确认实际版本管理方式。
- 详情页 `content_html` 直接渲染后台输入，若未来开放给非管理员编辑，必须增加 HTML 清洗。
