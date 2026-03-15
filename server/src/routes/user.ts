import { Hono } from "hono";
import { authMiddleware } from "../middlewares";
import { Bindings, Variables } from "../types";
import { getWeChatAccessTokenForUser as getWeChatAccessTokenForUserShared, WeChatTokenError } from "../wechat/token";
import { syncFollowersFromWeChat } from "../wechat/followers-sync";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", authMiddleware);

type NotificationSettings = {
    notify_email_enabled: 0 | 1;
    notify_dingtalk_enabled: 0 | 1;
    dingtalk_webhook_url: string;
};

type WeChatTestAccountConfig = {
    app_id: string;
    app_secret: string;
    token: string;
    template_id?: string;
    notify_wechat_enabled?: 0 | 1;
};

function parseSwitch(value: unknown, fieldName: string): 0 | 1 {
    if (value === 1 || value === "1" || value === true) return 1;
    if (value === 0 || value === "0" || value === false) return 0;
    throw new Error(`${fieldName} must be 0 or 1`);
}

function normalizeNonEmptyString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function normalizeWebhookUrl(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Basic URL sanity check (still allow non-DingTalk domains for proxies).
    try {
        const u = new URL(trimmed);
        if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    } catch {
        return null;
    }

    return trimmed;
}

function getWeChatErrFromUnknown(e: unknown): { errcode?: number; errmsg?: string } {
    if (e instanceof WeChatTokenError) {
        return { errcode: e.errcode, errmsg: e.errmsg || e.message };
    }

    if (e && typeof e === "object") {
        const obj = e as { errcode?: unknown; errmsg?: unknown; message?: unknown };
        const errcode = typeof obj.errcode === "number" ? obj.errcode : undefined;
        const errmsg =
            typeof obj.errmsg === "string" ? obj.errmsg : typeof obj.message === "string" ? obj.message : undefined;
        return { errcode, errmsg };
    }

    return { errmsg: typeof e === "string" ? e : undefined };
}

app.get("/wechat-test-account", async c => {
    const user = c.get("user");

    const row = await c.env.DB.prepare(
        `
        SELECT
          app_id,
          app_secret,
          token,
          template_id,
          notify_wechat_enabled,
          (length(trim(coalesce(app_secret, ''))) > 0) as has_app_secret,
          updated_at
        FROM wechat_test_accounts
        WHERE user_id = ?
      `
    )
        .bind(user.id)
        .first<{
            app_id: string;
            app_secret: string;
            token: string;
            template_id: string | null;
            notify_wechat_enabled: number | null;
            has_app_secret: number | null;
            updated_at: string;
        }>();

    if (!row) {
        return c.json({ bound: false }, 200);
    }

    const followers = await c.env.DB.prepare(
        `
        SELECT openid
        FROM wechat_followers
        WHERE user_id = ? AND app_id = ?
        ORDER BY id DESC
    `
    )
        .bind(user.id, row.app_id)
        .all<{ openid: string }>();

    c.header("Cache-Control", "no-store");
    return c.json({
        app_id: row.app_id,
        app_secret: row.app_secret,
        bound: true,
        followers: (followers.results ?? []).map(r => ({ openid: (r.openid || "").trim() })).filter(r => r.openid),
        has_app_secret: (row.has_app_secret ?? 0) ? 1 : 0,
        notify_wechat_enabled: (row.notify_wechat_enabled ?? 0) ? 1 : 0,
        template_id: row.template_id ?? "",
        token: row.token,
        updated_at: row.updated_at,
    });
});

app.put("/wechat-test-account", async c => {
    const user = c.get("user");
    const body = await c.req.json<Partial<WeChatTestAccountConfig>>();

    const current = await c.env.DB.prepare(
        "SELECT app_id, app_secret, token, template_id, notify_wechat_enabled FROM wechat_test_accounts WHERE user_id = ?"
    )
        .bind(user.id)
        .first<{
            app_id: string;
            app_secret: string;
            token: string;
            template_id: string | null;
            notify_wechat_enabled: number | null;
        }>();

    const incomingAppId = body.app_id === undefined ? undefined : normalizeNonEmptyString(body.app_id);
    const incomingAppSecret = body.app_secret === undefined ? undefined : normalizeNonEmptyString(body.app_secret);
    const incomingToken = body.token === undefined ? undefined : normalizeNonEmptyString(body.token);
    const incomingTemplateId = body.template_id === undefined ? undefined : normalizeNonEmptyString(body.template_id);

    let incomingWeChatEnabled: 0 | 1 | undefined = undefined;
    if (body.notify_wechat_enabled !== undefined) {
        try {
            incomingWeChatEnabled = parseSwitch(body.notify_wechat_enabled, "notify_wechat_enabled");
        } catch (e) {
            return c.json({ error: String(e) }, 400);
        }
    }

    // Enforce "all-or-nothing" on this endpoint:
    // if the client calls this save API, it must submit a full config (no partial updates).
    if (incomingAppId === undefined) return c.json({ error: "app_id is required" }, 400);
    if (incomingAppSecret === undefined) return c.json({ error: "app_secret is required" }, 400);
    if (incomingToken === undefined) return c.json({ error: "token is required" }, 400);
    if (incomingTemplateId === undefined) return c.json({ error: "template_id is required" }, 400);

    const appId = incomingAppId;
    const appSecret = incomingAppSecret;
    const token = incomingToken;
    const templateId = incomingTemplateId;
    const wechatEnabled: 0 | 1 = (incomingWeChatEnabled ?? ((current?.notify_wechat_enabled ?? 0) ? 1 : 0)) as 0 | 1;

    if (!appId) return c.json({ error: "app_id is required" }, 400);
    if (!appSecret) return c.json({ error: "app_secret is required" }, 400);
    if (!token) return c.json({ error: "token is required" }, 400);
    if (!templateId) return c.json({ error: "template_id is required" }, 400);

    // Explicit check for app_id duplication (do not rely on SQLite constraint only).
    const boundByOther = await c.env.DB.prepare(
        "SELECT user_id FROM wechat_test_accounts WHERE app_id = ? AND user_id <> ? LIMIT 1"
    )
        .bind(appId, user.id)
        .first<{ user_id: number }>();
    if (boundByOther) {
        return c.json(
            { error: "该 appID 已被其它 TJUEcard 账号绑定。请先在那个账号里解绑测试号，或换一个测试号 appID。" },
            409
        );
    }

    try {
        await c.env.DB.prepare(
            `
            INSERT INTO wechat_test_accounts (user_id, app_id, app_secret, token, template_id, notify_wechat_enabled, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
              app_id = excluded.app_id,
              app_secret = excluded.app_secret,
              token = excluded.token,
              template_id = excluded.template_id,
              notify_wechat_enabled = excluded.notify_wechat_enabled,
              updated_at = CURRENT_TIMESTAMP
        `
        )
            .bind(user.id, appId, appSecret, token, templateId, wechatEnabled)
            .run();
    } catch (e) {
        const msg = String(e);
        const lower = msg.toLowerCase();

        const appIdUniqueHit =
            lower.includes("unique") &&
            (lower.includes("wechat_test_accounts.app_id") ||
                lower.includes("idx_wechat_test_accounts_app_id") ||
                lower.includes("wechat_test_accounts(app_id)") ||
                lower.includes("app_id"));

        if (appIdUniqueHit) {
            return c.json(
                {
                    error: "该 appID 已被其它 TJUEcard 账号绑定。请先在那个账号里解绑测试号，或换一个测试号 appID。",
                },
                409
            );
        }

        return c.json({ error: "Failed to save WeChat config: " + msg }, 500);
    }

    return c.json({ bound: true });
});

app.delete("/wechat-test-account", async c => {
    const user = c.get("user");

    try {
        const current = await c.env.DB.prepare("SELECT app_id FROM wechat_test_accounts WHERE user_id = ?")
            .bind(user.id)
            .first<{ app_id: string }>();

        await c.env.DB.prepare("DELETE FROM wechat_test_accounts WHERE user_id = ?").bind(user.id).run();

        if (current?.app_id) {
            await c.env.DB.prepare("DELETE FROM wechat_followers WHERE user_id = ? AND app_id = ?")
                .bind(user.id, current.app_id)
                .run();
        }
    } catch (e) {
        return c.json({ error: "Failed to delete WeChat config: " + String(e) }, 500);
    }

    return c.json({ bound: false });
});

function formatWeChatTokenError(errcode: number, errmsg: string): string {
    switch (errcode) {
        case 40013:
            return "微信配置有误：appID 无效（errcode=40013）。请确认你填的是测试号后台显示的 appID。";
        case 40125:
            return "微信配置有误：appsecret 无效（errcode=40125）。请确认 appsecret 填写正确。";
        case 40001:
            return "微信接口凭证无效（errcode=40001）。请检查 appID/appsecret 是否正确，然后重试。";
        default:
            return `微信接口错误：errcode=${errcode} ${errmsg || ""}`.trim();
    }
}

const getWeChatAccessTokenForUser = getWeChatAccessTokenForUserShared;

// Sync followers (best-effort) and return updated list.
app.post("/wechat-test-account/refresh-followers", async c => {
    const user = c.get("user");

    let tokenInfo: { appId: string; appSecret: string; accessToken: string } | null = null;
    try {
        tokenInfo = await getWeChatAccessTokenForUser(c.env, user.id);
    } catch (e) {
        const { errcode, errmsg } = getWeChatErrFromUnknown(e);
        if (Number.isFinite(errcode)) {
            return c.json({ error: formatWeChatTokenError(errcode as number, String(errmsg || "")) }, 400);
        }
        return c.json({ error: "微信 access_token 获取失败，请检查 appID/appsecret 是否正确。" }, 400);
    }

    if (!tokenInfo) return c.json({ error: "WeChat test account not configured (missing appsecret)" }, 400);

    const errors: string[] = [];
    c.header("Cache-Control", "no-store");

    let sync: Awaited<ReturnType<typeof syncFollowersFromWeChat>>;
    try {
        sync = await syncFollowersFromWeChat({
            accessToken: tokenInfo.accessToken,
            appId: tokenInfo.appId,
            appSecret: tokenInfo.appSecret,
            env: c.env,
            userId: user.id,
        });
    } catch (e) {
        const { errcode, errmsg } = getWeChatErrFromUnknown(e);
        if (Number.isFinite(errcode)) {
            return c.json({ error: formatWeChatTokenError(errcode as number, String(errmsg || "")) }, 400);
        }
        return c.json({ error: "微信 access_token 刷新失败，请检查 appID/appsecret 是否正确。" }, 400);
    }

    const local = await c.env.DB.prepare(
        "SELECT openid FROM wechat_followers WHERE user_id = ? AND app_id = ? ORDER BY id DESC"
    )
        .bind(user.id, tokenInfo.appId)
        .all<{ openid: string }>();

    const followers = (local.results ?? []).map(r => ({ openid: (r.openid || "").trim() })).filter(r => r.openid);

    if (!sync.synced) {
        if (typeof sync.errcode === "number") {
            errors.push(`user/get errcode=${sync.errcode} errmsg=${sync.errmsg || ""}`.trim());
        }
        if (sync.warning) errors.push(sync.warning);

        const payload = { errors, followers };
        if (sync.errcode === 45009) {
            return c.json(
                {
                    ...payload,
                    error: "微信接口已达当日调用上限（errcode=45009）。已返回本地列表，建议明天再试。",
                },
                429
            );
        }

        return c.json(
            {
                ...payload,
                error: "微信同步失败，已返回本地列表。",
            },
            502
        );
    }

    return c.json({ errors, followers });
});

async function sendDingTalkText(webhookUrl: string, content: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const resp = await fetch(webhookUrl, {
            body: JSON.stringify({
                msgtype: "text",
                text: { content },
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
        });

        const data = (await resp.json().catch(() => null)) as { errcode?: number; errmsg?: string } | null;
        if (!resp.ok) {
            return { error: `HTTP ${resp.status}`, ok: false };
        }
        if (data && typeof data.errcode === "number" && data.errcode !== 0) {
            return { error: data.errmsg || `errcode=${data.errcode}`, ok: false };
        }
        return { ok: true };
    } catch (e) {
        return { error: String(e), ok: false };
    }
}

app.get("/notification-settings", async c => {
    const user = c.get("user");

    const row = await c.env.DB.prepare(
        "SELECT notify_email_enabled, notify_dingtalk_enabled, dingtalk_webhook_url FROM users WHERE id = ?"
    )
        .bind(user.id)
        .first<{
            notify_email_enabled: number | null;
            notify_dingtalk_enabled: number | null;
            dingtalk_webhook_url: string | null;
        }>();

    if (!row) return c.json({ error: "用户不存在" }, 404);

    const payload: NotificationSettings = {
        dingtalk_webhook_url: row.dingtalk_webhook_url ?? "",
        notify_dingtalk_enabled: (row.notify_dingtalk_enabled ?? 0) ? 1 : 0,
        notify_email_enabled: (row.notify_email_enabled ?? 1) ? 1 : 0,
    };

    return c.json(payload);
});

app.put("/notification-settings", async c => {
    const user = c.get("user");
    const body = await c.req.json<Partial<NotificationSettings>>();

    const current = await c.env.DB.prepare(
        "SELECT notify_email_enabled, notify_dingtalk_enabled, dingtalk_webhook_url FROM users WHERE id = ?"
    )
        .bind(user.id)
        .first<{
            notify_email_enabled: number | null;
            notify_dingtalk_enabled: number | null;
            dingtalk_webhook_url: string | null;
        }>();

    if (!current) return c.json({ error: "用户不存在" }, 404);

    let nextEmailEnabled: 0 | 1;
    let nextDingEnabled: 0 | 1;

    try {
        nextEmailEnabled =
            body.notify_email_enabled === undefined
                ? (current.notify_email_enabled ?? 1)
                    ? 1
                    : 0
                : parseSwitch(body.notify_email_enabled, "notify_email_enabled");
        nextDingEnabled =
            body.notify_dingtalk_enabled === undefined
                ? (current.notify_dingtalk_enabled ?? 0)
                    ? 1
                    : 0
                : parseSwitch(body.notify_dingtalk_enabled, "notify_dingtalk_enabled");
    } catch (e) {
        return c.json({ error: String(e) }, 400);
    }

    const incomingUrl = body.dingtalk_webhook_url === undefined ? undefined : body.dingtalk_webhook_url;
    const nextWebhookUrl =
        incomingUrl === undefined
            ? normalizeWebhookUrl(current.dingtalk_webhook_url)
            : normalizeWebhookUrl(incomingUrl);

    if (body.dingtalk_webhook_url !== undefined && body.dingtalk_webhook_url !== null && nextWebhookUrl === null) {
        // If client tries to set a value but it fails validation.
        const str = typeof body.dingtalk_webhook_url === "string" ? body.dingtalk_webhook_url.trim() : "";
        if (str) return c.json({ error: "Webhook URL 格式不正确" }, 400);
    }

    if (nextDingEnabled === 1 && !nextWebhookUrl) {
        return c.json({ error: "请先填写钉钉 Webhook URL 才能开启钉钉通知" }, 400);
    }

    const wasDingEnabled = (current.notify_dingtalk_enabled ?? 0) ? 1 : 0;
    let dingtalkEnableNotified = false;

    // When switching from OFF -> ON, send a one-time enable notification as a webhook validation.
    if (wasDingEnabled === 0 && nextDingEnabled === 1 && nextWebhookUrl) {
        const ts = new Date().toLocaleString("zh-CN", { hour12: false, timeZone: "Asia/Shanghai" });
        const content = `TJUEcard 通知已开启\n用户：${user.email}\n时间：${ts}`;
        const res = await sendDingTalkText(nextWebhookUrl, content);
        if (!res.ok) {
            return c.json({ error: `钉钉通知发送失败：${res.error || "unknown"}` }, 400);
        }
        dingtalkEnableNotified = true;
    }

    try {
        await c.env.DB.prepare(
            "UPDATE users SET notify_email_enabled = ?, notify_dingtalk_enabled = ?, dingtalk_webhook_url = ? WHERE id = ?"
        )
            .bind(nextEmailEnabled, nextDingEnabled, nextWebhookUrl, user.id)
            .run();
    } catch (e) {
        return c.json({ error: "保存失败: " + String(e) }, 500);
    }

    return c.json({
        dingtalk_enable_notified: dingtalkEnableNotified,
        dingtalk_webhook_url: nextWebhookUrl ?? "",
        notify_dingtalk_enabled: nextDingEnabled,
        notify_email_enabled: nextEmailEnabled,
    });
});

export default app;
