import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tyyc-admin-"));
process.env.DATABASE_PATH = path.join(tmpDir, "test.db");
process.env.ADMIN_INITIAL_PASSWORD = "admin123";

type Handler = (req: NextRequest, ctx?: unknown) => Promise<Response>;

let login: Handler;
let me: Handler;
let logout: Handler;
let listLotteries: Handler;
let createLottery: Handler;
let updateLottery: Handler;
let deleteLottery: Handler;
let getSettings: Handler;
let putSettings: Handler;
let resetTotal: Handler;
let publicList: Handler;
let cookie = "";

function jsonReq(url: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.90", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

before(async () => {
  login = (await import("../src/app/api/admin/login/route")).POST as unknown as Handler;
  me = (await import("../src/app/api/admin/me/route")).GET as unknown as Handler;
  logout = (await import("../src/app/api/admin/logout/route")).POST as unknown as Handler;
  listLotteries = (await import("../src/app/api/admin/lotteries/route")).GET as unknown as Handler;
  createLottery = (await import("../src/app/api/admin/lotteries/route")).POST as unknown as Handler;
  const item = await import("../src/app/api/admin/lotteries/[id]/route");
  updateLottery = item.PUT as unknown as Handler;
  deleteLottery = item.DELETE as unknown as Handler;
  const settings = await import("../src/app/api/admin/settings/route");
  getSettings = settings.GET as unknown as Handler;
  putSettings = settings.PUT as unknown as Handler;
  resetTotal = (await import("../src/app/api/admin/reset-total/route")).POST as unknown as Handler;
  publicList = (await import("../src/app/api/lotteries/route")).GET as unknown as Handler;
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("管理端鉴权", () => {
  it("无会话访问受保护接口返回 401", async () => {
    const res = await listLotteries(jsonReq("/api/admin/lotteries", "GET"));
    assert.equal(res.status, 401);
  });

  it("错误密码返回 401", async () => {
    const res = await login(jsonReq("/api/admin/login", "POST", { username: "admin", password: "wrong" }));
    assert.equal(res.status, 401);
  });

  it("正确密码登录后可访问受保护接口，退出后失效", async () => {
    const res = await login(
      jsonReq("/api/admin/login", "POST", { username: "admin", password: "admin123" })
    );
    assert.equal(res.status, 200);
    const setCookie = res.headers.get("set-cookie") || "";
    assert.match(setCookie, /tyyc_admin=/);
    cookie = setCookie.split(";")[0]!;

    const meRes = await me(jsonReq("/api/admin/me", "GET", undefined, { cookie }));
    assert.equal(meRes.status, 200);
    const meData = (await meRes.json()) as { username: string };
    assert.equal(meData.username, "admin");

    await logout(jsonReq("/api/admin/logout", "POST", undefined, { cookie }));
  });
});

describe("管理端 CRUD 与公开接口联通", () => {
  it("新增 → 公开列表可见 → 修改 → 删除", async () => {
    const created = await createLottery(
      jsonReq(
        "/api/admin/lotteries",
        "POST",
        {
          name: "测试方案",
          year: "2026",
          match_time: "2026-10-24",
          hit_rate: "5中4",
          content_html: "<p>详情</p>",
          footer_text: "联系客服获取访问权限",
          sort: 9,
        },
        { cookie }
      )
    );
    assert.equal(created.status, 201);
    const row = (await created.json()) as { id: number; name: string };
    assert.equal(row.name, "测试方案");

    const pub = await publicList(jsonReq("/api/lotteries", "GET"));
    const list = (await pub.json()) as Array<{ id: number; name: string; hit_rate: string }>;
    assert.ok(list.some((l) => l.id === row.id));
  });

  it("修改字段生效，删除后公开列表不再包含", async () => {
    const listRes = await listLotteries(jsonReq("/api/admin/lotteries", "GET", undefined, { cookie }));
    const items = (await listRes.json()) as Array<{ id: number; name: string }>;
    const target = items.find((i) => i.name === "测试方案")!;
    assert.ok(target);

    const updated = await updateLottery(
      jsonReq(
        `/api/admin/lotteries/${target.id}`,
        "PUT",
        { name: "测试方案-改", hit_rate: "6中5", sort: 0 },
        { cookie }
      ),
      { params: Promise.resolve({ id: String(target.id) }) }
    );
    assert.equal(updated.status, 200);
    assert.equal(((await updated.json()) as { name: string }).name, "测试方案-改");

    const pub = (await (
      await publicList(jsonReq("/api/lotteries", "GET"))
    ).json()) as Array<{ id: number; name: string }>;
    assert.equal(pub[0]!.id, target.id); // sort=0 排到首位

    const del = await deleteLottery(
      jsonReq(`/api/admin/lotteries/${target.id}`, "DELETE", undefined, { cookie }),
      { params: Promise.resolve({ id: String(target.id) }) }
    );
    assert.equal(del.status, 200);

    const after = (await (await publicList(jsonReq("/api/lotteries", "GET"))).json()) as Array<{
      id: number;
    }>;
    assert.ok(!after.some((l) => l.id === target.id));
  });
});

describe("设置与计数", () => {
  it("设置可读写，且不暴露内部密钥", async () => {
    const put = await putSettings(
      jsonReq("/api/admin/settings", "PUT", { home_notice: "测试声明", chat_total_limit: "800" }, { cookie })
    );
    assert.equal(put.status, 200);
    const data = (await put.json()) as Record<string, string>;
    assert.equal(data.home_notice, "测试声明");
    assert.equal(data.chat_total_limit, "800");
    assert.equal("auth_secret" in data, false);

    const get = (await (await getSettings(jsonReq("/api/admin/settings", "GET", undefined, { cookie }))).json()) as Record<
      string,
      string
    >;
    assert.equal(get.home_notice, "测试声明");
  });

  it("重置累计次数", async () => {
    const res = await resetTotal(jsonReq("/api/admin/reset-total", "POST", undefined, { cookie }));
    assert.equal(res.status, 200);
    const data = (await res.json()) as { chat_total_used: string };
    assert.equal(data.chat_total_used, "0");
  });
});
