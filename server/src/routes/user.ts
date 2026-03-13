import { Hono } from "hono";
import { authMiddleware } from "../middlewares";
import { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", authMiddleware);

type NotificationSettings = {
    notify_email_enabled: 0 | 1;
    notify_dingtalk_enabled: 0 | 1;
    dingtalk_webhook_url: string;
};

function parseSwitch(value: unknown, fieldName: string): 0 | 1 {
    if (value === 1 || value === "1" || value === true) return 1;
    if (value === 0 || value === "0" || value === false) return 0;
    throw new Error(`${fieldName} must be 0 or 1`);
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
