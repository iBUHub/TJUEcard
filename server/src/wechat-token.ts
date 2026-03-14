import { Bindings } from "./types";

export class WeChatTokenError extends Error {
    errcode?: number;
    errmsg?: string;
    constructor(message: string, opts?: { errcode?: number; errmsg?: string }) {
        super(message);
        this.name = "WeChatTokenError";
        this.errcode = opts?.errcode;
        this.errmsg = opts?.errmsg;
    }
}

type AccessTokenResponse = { access_token: string; expires_in: number } | { errcode: number; errmsg: string };

function isWeChatApiError(obj: unknown): obj is { errcode: number; errmsg: string } {
    return (
        !!obj &&
        typeof obj === "object" &&
        typeof (obj as { errcode?: unknown }).errcode === "number" &&
        typeof (obj as { errmsg?: unknown }).errmsg === "string"
    );
}

function isAccessTokenSuccess(obj: AccessTokenResponse): obj is { access_token: string; expires_in: number } {
    return (
        !!obj &&
        typeof obj === "object" &&
        typeof (obj as { access_token?: unknown }).access_token === "string" &&
        typeof (obj as { expires_in?: unknown }).expires_in === "number"
    );
}

export async function refreshWeChatAccessTokenForAccount(
    env: Bindings,
    appId: string,
    appSecret: string
): Promise<string> {
    const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
    url.searchParams.set("grant_type", "client_credential");
    url.searchParams.set("appid", appId);
    url.searchParams.set("secret", appSecret);

    const resp = await fetch(url.toString());
    const json = (await resp.json().catch(() => null)) as AccessTokenResponse | null;

    if (!resp.ok || !json)
        throw new WeChatTokenError(`WeChat token HTTP ${resp.status}`, { errcode: -1, errmsg: `HTTP ${resp.status}` });
    if (isWeChatApiError(json) && json.errcode !== 0) {
        throw new WeChatTokenError(`WeChat token errcode=${json.errcode} errmsg=${json.errmsg}`, {
            errcode: json.errcode,
            errmsg: json.errmsg,
        });
    }

    if (!isAccessTokenSuccess(json))
        throw new WeChatTokenError("WeChat token response invalid", { errcode: -1, errmsg: "invalid response" });

    const accessToken = json.access_token;
    const expiresIn = json.expires_in;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + Math.max(0, expiresIn - 120);

    await env.DB.prepare(
        `
        UPDATE wechat_test_accounts
        SET access_token = ?, access_token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE app_id = ?
    `
    )
        .bind(accessToken, expiresAt, appId)
        .run();

    return accessToken;
}

export async function getWeChatAccessTokenForUser(
    env: Bindings,
    userId: number
): Promise<{
    appId: string;
    appSecret: string;
    accessToken: string;
} | null> {
    const account = await env.DB.prepare(
        "SELECT app_id, app_secret, access_token, access_token_expires_at FROM wechat_test_accounts WHERE user_id = ?"
    )
        .bind(userId)
        .first<{
            app_id: string;
            app_secret: string;
            access_token: string | null;
            access_token_expires_at: number | null;
        }>();

    if (!account) return null;
    const appId = (account.app_id || "").trim();
    const appSecret = (account.app_secret || "").trim();
    if (!appId || !appSecret) return null;

    const now = Math.floor(Date.now() / 1000);
    const token = (account.access_token || "").trim();
    const exp = account.access_token_expires_at ?? 0;

    if (token && exp > now + 60) {
        return { accessToken: token, appId, appSecret };
    }

    const refreshed = await refreshWeChatAccessTokenForAccount(env, appId, appSecret);
    return { accessToken: refreshed, appId, appSecret };
}

export async function getWeChatAccessTokenForAccount(
    env: Bindings,
    account: { app_id: string; app_secret: string; access_token: string | null; access_token_expires_at: number | null }
): Promise<string> {
    const appId = (account.app_id || "").trim();
    const appSecret = (account.app_secret || "").trim();
    if (!appId || !appSecret) throw new WeChatTokenError("missing app_id/app_secret");

    const now = Math.floor(Date.now() / 1000);
    const token = (account.access_token || "").trim();
    const exp = account.access_token_expires_at ?? 0;

    if (token && exp > now + 60) return token;
    return refreshWeChatAccessTokenForAccount(env, appId, appSecret);
}
