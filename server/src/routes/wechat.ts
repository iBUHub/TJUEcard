import { Hono } from "hono";
import { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

async function sha1Hex(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-1", data);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyWeChatSignature(params: {
    token: string;
    timestamp: string;
    nonce: string;
    signature: string;
}): Promise<boolean> {
    const { token, timestamp, nonce, signature } = params;
    const toSign = [token, timestamp, nonce].sort().join("");
    const expected = await sha1Hex(toSign);
    return expected === signature;
}

async function getTokenByAppId(env: Bindings, appId: string): Promise<string | null> {
    const row = await env.DB.prepare("SELECT token FROM wechat_test_accounts WHERE app_id = ?")
        .bind(appId)
        .first<{ token: string | null }>();
    const token = row?.token ?? null;
    return isNonEmptyString(token) ? token.trim() : null;
}

type WeChatCallbackParsed = {
    toUserName: string | null;
    fromUserName: string | null;
    msgType: string | null;
    event: string | null;
};

function parseXmlTag(xml: string, tag: string): string | null {
    // Handles both plain text and CDATA:
    // <Tag><![CDATA[value]]></Tag> or <Tag>value</Tag>
    // Use [\\s\\S] to match across newlines (WeChat XML often contains line breaks).
    const re = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
    const m = xml.match(re);
    const value = (m?.[1] ?? m?.[2] ?? "").trim();
    return value ? value : null;
}

function parseWeChatCallbackXml(xml: string): WeChatCallbackParsed {
    return {
        event: parseXmlTag(xml, "Event"),
        fromUserName: parseXmlTag(xml, "FromUserName"),
        msgType: parseXmlTag(xml, "MsgType"),
        toUserName: parseXmlTag(xml, "ToUserName"),
    };
}

async function bindFollowerEvent(env: Bindings, appId: string, openid: string, event: string) {
    const account = await env.DB.prepare("SELECT user_id FROM wechat_test_accounts WHERE app_id = ?")
        .bind(appId)
        .first<{ user_id: number }>();
    if (!account) return;
    const accountRow = account;

    const subscribed = event.toLowerCase() === "unsubscribe" ? 0 : 1;

    if (subscribed !== 1) {
        // Match WeChat behavior: once unsubscribed, it no longer appears in the follower list.
        // We remove the record entirely (instead of keeping subscribed=0).
        await env.DB.prepare("DELETE FROM wechat_followers WHERE app_id = ? AND openid = ?").bind(appId, openid).run();
        return;
    }

    await env.DB.prepare(
        `
        INSERT INTO wechat_followers (user_id, app_id, openid)
        VALUES (?, ?, ?)
        ON CONFLICT(app_id, openid) DO UPDATE SET
          user_id = excluded.user_id
    `
    )
        .bind(accountRow.user_id, appId, openid)
        .run();

    // We intentionally do NOT persist a "target receiver" openid.
    // Notifications are sent to all openids currently in this test account follower list.
}

// WeChat server configuration verification (GET)
// URL example: https://<your-domain>/wechat/<appId>/callback
app.get("/:appId/callback", async c => {
    const appId = c.req.param("appId");

    const signature = c.req.query("signature");
    const timestamp = c.req.query("timestamp");
    const nonce = c.req.query("nonce");
    const echostr = c.req.query("echostr");

    if (
        !isNonEmptyString(signature) ||
        !isNonEmptyString(timestamp) ||
        !isNonEmptyString(nonce) ||
        !isNonEmptyString(echostr)
    ) {
        return c.text("Missing required query params", 400);
    }

    const token = await getTokenByAppId(c.env, appId);
    if (!token) return c.text("Unknown appId", 404);

    const ok = await verifyWeChatSignature({
        nonce: nonce.trim(),
        signature: signature.trim(),
        timestamp: timestamp.trim(),
        token,
    });

    if (!ok) return c.text("Invalid signature", 401);
    return c.text(echostr.trim());
});

// WeChat message/event callback (POST)
// For now we only acknowledge to prevent retries; signature is still verified.
app.post("/:appId/callback", async c => {
    const appId = c.req.param("appId");

    const signature = c.req.query("signature");
    const timestamp = c.req.query("timestamp");
    const nonce = c.req.query("nonce");
    const encryptType = c.req.query("encrypt_type"); // "aes" when encrypted mode is enabled

    if (!isNonEmptyString(signature) || !isNonEmptyString(timestamp) || !isNonEmptyString(nonce)) {
        return c.text("Missing required query params", 400);
    }

    if (isNonEmptyString(encryptType) && encryptType.toLowerCase() === "aes") {
        // We only support plaintext mode for now.
        return c.text("Encrypted mode (AES) not supported; set plaintext mode", 400);
    }

    const token = await getTokenByAppId(c.env, appId);
    if (!token) return c.text("Unknown appId", 404);

    const ok = await verifyWeChatSignature({
        nonce: nonce.trim(),
        signature: signature.trim(),
        timestamp: timestamp.trim(),
        token,
    });

    if (!ok) return c.text("Invalid signature", 401);

    const bodyText = await c.req.text();
    if (isNonEmptyString(bodyText)) {
        const parsed = parseWeChatCallbackXml(bodyText);
        const msgType = (parsed.msgType || "").toLowerCase();
        const event = (parsed.event || "").toLowerCase();
        const openid = parsed.fromUserName;

        if (msgType === "event" && isNonEmptyString(openid) && (event === "subscribe" || event === "unsubscribe")) {
            try {
                await bindFollowerEvent(c.env, appId, openid.trim(), event);
            } catch (e) {
                console.error("[WeChat] bindFollowerEvent failed:", e);
            }
        }
    }

    // NOTE: WeChat expects a plain "success" for most event/message types when you don't reply.
    // We intentionally avoid heavy XML parsing here; future work can process subscribe/unsubscribe events.
    return c.text("success");
});

export default app;
