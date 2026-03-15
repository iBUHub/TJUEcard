import { Bindings } from "../types";
import { syncFollowersFromWeChat as syncFollowersFromWeChatShared } from "./followers-sync";
import { getWeChatAccessTokenForAccount, refreshWeChatAccessTokenForAccount } from "./token";

type WeChatApiError = { errcode: number; errmsg: string };

type TemplateSendResponse = { msgid?: number } | WeChatApiError;

function isWeChatApiError(obj: unknown): obj is WeChatApiError {
    return (
        !!obj &&
        typeof obj === "object" &&
        typeof (obj as { errcode?: unknown }).errcode === "number" &&
        typeof (obj as { errmsg?: unknown }).errmsg === "string"
    );
}

export type WeChatSendLowElectricityParams = {
    roomAlias: string;
    roomFullName: string | null;
    electric: number;
    threshold: number;
};

type WeChatAccountRow = {
    app_id: string;
    app_secret: string;
    template_id: string | null;
    notify_wechat_enabled: number | null;
    access_token: string | null;
    access_token_expires_at: number | null;
};

async function getWeChatAccountByUserId(env: Bindings, userId: number): Promise<WeChatAccountRow | null> {
    const row = await env.DB.prepare(
        `
        SELECT app_id, app_secret, template_id, notify_wechat_enabled, access_token, access_token_expires_at
        FROM wechat_test_accounts
        WHERE user_id = ?
    `
    )
        .bind(userId)
        .first<WeChatAccountRow>();
    return row ?? null;
}

async function sendTemplateMessage(params: {
    accessToken: string;
    templateId: string;
    toUser: string;
    url?: string;
    data: Record<string, { value: string; color?: string }>;
}): Promise<{ ok: boolean; errcode?: number; error?: string }> {
    const endpoint = new URL("https://api.weixin.qq.com/cgi-bin/message/template/send");
    endpoint.searchParams.set("access_token", params.accessToken);

    const payload = {
        data: params.data,
        template_id: params.templateId,
        touser: params.toUser,
        url: params.url,
    };

    const resp = await fetch(endpoint.toString(), {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
    });

    const json = (await resp.json().catch(() => null)) as TemplateSendResponse | null;
    if (!resp.ok || !json) return { error: `HTTP ${resp.status}`, ok: false };
    if (isWeChatApiError(json) && json.errcode !== 0) {
        return { errcode: json.errcode, error: `errcode=${json.errcode} errmsg=${json.errmsg}`, ok: false };
    }
    return { ok: true };
}

export async function sendWeChatLowElectricityNotification(
    env: Bindings,
    userId: number,
    params: WeChatSendLowElectricityParams
): Promise<{ ok: boolean; skipped?: boolean; error?: string; warning?: string }> {
    const account = await getWeChatAccountByUserId(env, userId);
    if (!account) return { ok: false, skipped: true };

    const enabled = (account.notify_wechat_enabled ?? 0) ? 1 : 0;
    if (enabled !== 1) return { ok: false, skipped: true };

    const templateId = (account.template_id || "").trim();
    if (!templateId) return { error: "missing template_id", ok: false };

    // Ensure access_token and follower list are as fresh as possible before sending.
    let accessToken = await getWeChatAccessTokenForAccount(env, account);
    const sync = await syncFollowersFromWeChatShared({
        accessToken,
        appId: account.app_id,
        appSecret: account.app_secret,
        env,
        userId,
    });
    const openids = sync.openids;
    if (openids.length === 0) return { error: "missing follower openid (please follow the test account)", ok: false };

    const roomText = params.roomFullName ? `${params.roomAlias}（${params.roomFullName}）` : params.roomAlias;
    const thresholdText = params.threshold === -1 ? "始终通知" : `${params.threshold} 度`;
    const electricText = `${params.electric} 度`;

    // IMPORTANT: WeChat template fields do NOT include `keyword0` (numbering starts at 1).
    // Use keyword4/keyword5 if you want header/footer lines in the template content.
    const data = {
        keyword1: { value: roomText },
        keyword2: { value: electricText },
        keyword3: { value: thresholdText },
        keyword4: { value: "请及时充值，避免断电" },
        keyword5: { value: "TJUEcard 电费提醒" },
    };

    const trySendTo = async (toUser: string, token: string) =>
        sendTemplateMessage({ accessToken: token, data, templateId, toUser, url: "https://tjuecard.ibuhub.com/" });

    const errors: string[] = [];
    let successCount = 0;

    for (const openid of openids) {
        let res = await trySendTo(openid, accessToken);
        if (!res.ok) {
            const code = res.errcode ?? -1;
            // Token expired/invalid: refresh once and retry (and reuse for subsequent sends).
            if (code === 40001 || code === 42001 || code === 40014) {
                accessToken = await refreshWeChatAccessTokenForAccount(env, account.app_id, account.app_secret);
                res = await trySendTo(openid, accessToken);
            }
        }

        if (!res.ok) {
            errors.push(`openid=${openid} ${res.error || "unknown"}`);
        } else {
            successCount++;
        }
    }

    if (successCount === 0) return { error: errors[0] || "unknown", ok: false };
    if (errors.length > 0) return { ok: true, warning: errors[0] };
    if (sync.warning) return { ok: true, warning: sync.warning };
    return { ok: true };
}

export async function sendWeChatTestNotification(
    env: Bindings,
    userId: number
): Promise<{ ok: boolean; error?: string; warning?: string; sent?: number; failed?: number }> {
    const account = await getWeChatAccountByUserId(env, userId);
    if (!account) return { error: "WeChat test account not configured", ok: false };

    const templateId = (account.template_id || "").trim();
    if (!templateId) return { error: "missing template_id", ok: false };

    // Do NOT sync/refresh followers here. The UI already refreshes on opening settings.
    // We send to all locally stored followers (openid list) to avoid extra WeChat API calls.
    const rows = await env.DB.prepare(
        `
        SELECT openid
        FROM wechat_followers
        WHERE user_id = ? AND app_id = ?
        ORDER BY id DESC
      `
    )
        .bind(userId, account.app_id)
        .all<{ openid: string }>();

    const openidsUnique: string[] = [];
    const seen = new Set<string>();
    for (const r of rows.results ?? []) {
        const openid = (r.openid || "").trim();
        if (!openid || seen.has(openid)) continue;
        seen.add(openid);
        openidsUnique.push(openid);
    }

    if (openidsUnique.length === 0) {
        return { error: "missing follower openid (please follow the test account)", ok: false };
    }

    let accessToken = await getWeChatAccessTokenForAccount(env, account);

    const now = new Date();
    const timeText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
    ).padStart(
        2,
        "0"
    )} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
        now.getSeconds()
    ).padStart(2, "0")}`;

    // Reuse the same field set the UI suggests when creating the template:
    // first, keyword1, keyword2, keyword3, remark.
    const data = {
        keyword1: { value: `测试房间（${timeText}）` },
        keyword2: { value: "66 kWh" },
        keyword3: { value: "1895 kWh" },
        keyword4: { value: "这是一条测试消息，不代表真实电量。" },
        keyword5: { value: "TJUEcard 测试通知" },
    };

    const trySend = async (toUser: string, token: string) =>
        sendTemplateMessage({
            accessToken: token,
            data,
            templateId,
            toUser,
            url: "https://tjuecard.ibuhub.com/",
        });

    const errors: string[] = [];
    let successCount = 0;

    for (const toUser of openidsUnique) {
        let res = await trySend(toUser, accessToken);
        if (!res.ok) {
            const code = res.errcode ?? -1;
            if (code === 40001 || code === 42001 || code === 40014) {
                accessToken = await refreshWeChatAccessTokenForAccount(env, account.app_id, account.app_secret);
                res = await trySend(toUser, accessToken);
            }
        }

        if (!res.ok) {
            errors.push(`openid=${toUser} ${res.error || "unknown"}`);
        } else {
            successCount++;
        }
    }

    const failed = errors.length;
    if (successCount === 0) return { error: errors[0] || "unknown", failed, ok: false, sent: 0 };
    if (failed > 0) return { failed, ok: true, sent: successCount, warning: errors[0] };
    return { failed: 0, ok: true, sent: successCount };
}
