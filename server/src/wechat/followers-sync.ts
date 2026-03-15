import { fetchWeChatSubscribedOpenIds } from "./followers";
import { refreshWeChatAccessTokenForAccount } from "./token";
import type { Bindings } from "../types";

export type WeChatFollowerSyncResult = {
    openids: string[];
    synced: boolean;
    warning?: string;
    errcode?: number;
    errmsg?: string;
};

async function listLocalOpenIds(env: Bindings, userId: number, appId: string): Promise<string[]> {
    const rows = await env.DB.prepare(
        `
        SELECT openid
        FROM wechat_followers
        WHERE user_id = ? AND app_id = ?
        ORDER BY id DESC
    `
    )
        .bind(userId, appId)
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

export async function syncFollowersFromWeChat(params: {
    env: Bindings;
    userId: number;
    appId: string;
    appSecret: string;
    accessToken: string;
}): Promise<WeChatFollowerSyncResult> {
    const { env, userId } = params;
    const appId = (params.appId || "").trim();
    const appSecret = (params.appSecret || "").trim();
    let accessToken = (params.accessToken || "").trim();

    if (!appId || !appSecret) {
        const local = await listLocalOpenIds(env, userId, appId);
        return { openids: local, synced: false, warning: "missing app_id/app_secret" };
    }

    if (!accessToken) {
        const local = await listLocalOpenIds(env, userId, appId);
        return { openids: local, synced: false, warning: "missing access_token" };
    }

    // 1) Pull from WeChat
    let res = await fetchWeChatSubscribedOpenIds(accessToken);

    // Token invalid/expired: refresh once and retry
    if (res.errcode === 40001 || res.errcode === 42001 || res.errcode === 40014) {
        const fresh = await refreshWeChatAccessTokenForAccount(env, appId, appSecret);
        res = await fetchWeChatSubscribedOpenIds(fresh);
        accessToken = fresh;
    }

    // On API errors (esp. daily quota 45009), do NOT mutate DB; fallback to local list.
    if (res.errcode && res.errcode !== 0) {
        const local = await listLocalOpenIds(env, userId, appId);
        const warning =
            res.errcode === 45009
                ? "微信接口已达当日调用上限（errcode=45009），已使用本地关注者列表。"
                : `微信关注者同步失败：errcode=${res.errcode} ${(res.errmsg || "").trim()}`.trim();
        return { errcode: res.errcode, errmsg: res.errmsg, openids: local, synced: false, warning };
    }

    if (res.truncated) {
        const local = await listLocalOpenIds(env, userId, appId);
        return {
            openids: local,
            synced: false,
            warning:
                "微信关注者列表过大：获取时达到分页上限（maxPages=20），为避免数据不完整导致误删，已使用本地列表。",
        };
    }

    const openids = (res.openids ?? []).map(x => x.trim()).filter(Boolean);

    // 2) Sync to DB (small dataset, simplest: replace the set)
    await env.DB.prepare("DELETE FROM wechat_followers WHERE user_id = ? AND app_id = ?").bind(userId, appId).run();

    for (const openid of openids) {
        await env.DB.prepare(
            `
            INSERT INTO wechat_followers (user_id, app_id, openid)
            VALUES (?, ?, ?)
            ON CONFLICT(app_id, openid) DO UPDATE SET
              user_id = excluded.user_id
        `
        )
            .bind(userId, appId, openid)
            .run();
    }

    return { openids, synced: true };
}
