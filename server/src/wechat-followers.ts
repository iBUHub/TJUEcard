export async function fetchWeChatSubscribedOpenIds(
    accessToken: string
): Promise<{ openids: string[]; errcode?: number; errmsg?: string }> {
    const openids: string[] = [];
    let nextOpenid = "";

    type UserGetSuccess = { total: number; count: number; data?: { openid?: string[] }; next_openid?: string };
    type UserGetError = { errcode: number; errmsg: string };

    // Safety cap to avoid infinite loops / quota burn on unexpected API behavior.
    // Keep at 20 to match previous behavior (max pages, not follower count).
    const maxPages = 20;

    for (let i = 0; i < maxPages; i++) {
        const url = new URL("https://api.weixin.qq.com/cgi-bin/user/get");
        url.searchParams.set("access_token", accessToken);
        if (nextOpenid) url.searchParams.set("next_openid", nextOpenid);

        const resp = await fetch(url.toString());
        const json = (await resp.json().catch(() => null)) as UserGetSuccess | UserGetError | null;

        if (!resp.ok || !json) {
            return { errcode: -1, errmsg: `HTTP ${resp.status}`, openids: [] };
        }

        if ("errcode" in json) return { errcode: json.errcode, errmsg: json.errmsg, openids: [] };

        const list = Array.isArray(json.data?.openid) ? json.data.openid : [];
        for (const id of list) {
            const v = typeof id === "string" ? id.trim() : "";
            if (v) openids.push(v);
        }

        const next = typeof json.next_openid === "string" ? json.next_openid.trim() : "";
        if (!next || next === nextOpenid || list.length === 0) break;
        nextOpenid = next;
    }

    return { openids };
}
