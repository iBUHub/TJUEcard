import { Bindings } from "./types";
import { fetchWeChatSubscribedOpenIds } from "./wechat-followers";
import { getWeChatAccessTokenForAccount, refreshWeChatAccessTokenForAccount } from "./wechat-token";

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

async function listOpenIds(env: Bindings, account: WeChatAccountRow, userId: number): Promise<string[]> {
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

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const r of rows.results ?? []) {
        const openid = (r.openid || "").trim();
        if (!openid || seen.has(openid)) continue;
        seen.add(openid);
        unique.push(openid);
    }
    return unique;
}

async function syncFollowersFromWeChat(
    env: Bindings,
    userId: number,
    account: WeChatAccountRow,
    accessToken: string
): Promise<{ openids: string[]; synced: boolean; warning?: string }> {
    // 1) Pull from WeChat
    let res = await fetchWeChatSubscribedOpenIds(accessToken);

    // Token invalid/expired: refresh once and retry
    if (res.errcode === 40001 || res.errcode === 42001 || res.errcode === 40014) {
        const fresh = await refreshWeChatAccessTokenForAccount(env, account.app_id, account.app_secret);
        res = await fetchWeChatSubscribedOpenIds(fresh);
        accessToken = fresh;
    }

    // On API errors (esp. daily quota 45009), do NOT mutate DB; fallback to local list.
    if (res.errcode && res.errcode !== 0) {
        const local = await listOpenIds(env, account, userId);
        const warning =
            res.errcode === 45009
                ? "微信接口已达当日调用上限（errcode=45009），已使用本地关注者列表发送。"
                : `微信关注者同步失败：errcode=${res.errcode} ${(res.errmsg || "").trim()}`.trim();
        return { openids: local, synced: false, warning };
    }

    const openids = (res.openids ?? []).map(x => x.trim()).filter(Boolean);

    // 2) Sync to DB (small dataset, simplest: replace the set)
    await env.DB.prepare("DELETE FROM wechat_followers WHERE user_id = ? AND app_id = ?")
        .bind(userId, account.app_id)
        .run();

    for (const openid of openids) {
        await env.DB.prepare(
            `
            INSERT INTO wechat_followers (user_id, app_id, openid)
            VALUES (?, ?, ?)
            ON CONFLICT(app_id, openid) DO UPDATE SET
              user_id = excluded.user_id
        `
        )
            .bind(userId, account.app_id, openid)
            .run();
    }

    return { openids, synced: true };
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
    const sync = await syncFollowersFromWeChat(env, userId, account, accessToken);
    const openids = sync.openids;
    if (openids.length === 0) return { error: "missing follower openid (please follow the test account)", ok: false };

    const roomText = params.roomFullName ? `${params.roomAlias}（${params.roomFullName}）` : params.roomAlias;
    const thresholdText = params.threshold === -1 ? "始终通知" : `${params.threshold} 度`;
    const electricText = `${params.electric} 度`;

    // Recommended: pick a template that has fields: first, keyword1, keyword2, keyword3, remark.
    const data = {
        first: { color: "#ff4d4f", value: "TJUEcard 电费提醒：余额不足" },
        keyword1: { value: roomText },
        keyword2: { value: electricText },
        keyword3: { value: thresholdText },
        remark: { color: "#666666", value: "请及时充值，避免突然断电。" },
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
