import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { authMiddleware } from "../middlewares";
import { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const QUERY_KEY_TYPE = "electricity_query";
const QUERY_KEY_SCOPE = "read:electricity";
const MAX_QUERY_KEY_ROOMS = 20;

const EXPIRES_IN_SECONDS: Record<string, number> = {
    "7d": 60 * 60 * 24 * 7,
    "30d": 60 * 60 * 24 * 30,
    "90d": 60 * 60 * 24 * 90,
    "365d": 60 * 60 * 24 * 365,
    forever: 60 * 60 * 24 * 365 * 10,
};

type QueryKeyPayload = {
    exp: number;
    jti: string;
    rids: number[];
    scope: string;
    typ: string;
    uid: number;
};

function getQuerySecret(jwtSecret: string): string {
    return `${jwtSecret}:electricity-query`;
}

function getBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) return null;
    return token;
}

function normalizeRoomIds(roomIds: unknown): number[] {
    if (!Array.isArray(roomIds)) return [];

    const normalized = roomIds.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0);

    return [...new Set(normalized)];
}

function makePlaceholders(count: number): string {
    return Array.from({ length: count }, () => "?").join(", ");
}

function toExpiresAt(exp: number): string {
    return new Date(exp * 1000).toISOString();
}

function isQueryPayload(payload: unknown): payload is QueryKeyPayload {
    if (!payload || typeof payload !== "object") return false;
    const candidate = payload as Partial<QueryKeyPayload>;
    return (
        candidate.typ === QUERY_KEY_TYPE &&
        candidate.scope === QUERY_KEY_SCOPE &&
        typeof candidate.uid === "number" &&
        Number.isInteger(candidate.uid) &&
        Array.isArray(candidate.rids) &&
        candidate.rids.every(id => Number.isInteger(id) && id > 0) &&
        typeof candidate.exp === "number"
    );
}

app.post("/query-key", authMiddleware, async c => {
    const user = c.get("user");
    const body = await c.req.json<{ expires_in?: string; room_ids?: unknown }>().catch(() => null);

    const roomIds = normalizeRoomIds(body?.room_ids);
    if (roomIds.length === 0) return c.json({ error: "请选择至少一个房间" }, 400);
    if (roomIds.length > MAX_QUERY_KEY_ROOMS) {
        return c.json({ error: `单个查询 Key 最多支持 ${MAX_QUERY_KEY_ROOMS} 个房间` }, 400);
    }

    const expiresIn = body?.expires_in || "90d";
    const ttl = EXPIRES_IN_SECONDS[expiresIn];
    if (!ttl) return c.json({ error: "不支持的有效期" }, 400);

    const placeholders = makePlaceholders(roomIds.length);
    const subscribed = await c.env.DB.prepare(
        `
        SELECT room_id
        FROM subscriptions
        WHERE user_id = ?
          AND is_active = 1
          AND room_id IN (${placeholders})
    `
    )
        .bind(user.id, ...roomIds)
        .all<{ room_id: number }>();

    const subscribedIds = subscribed.results.map(row => row.room_id);
    if (subscribedIds.length !== roomIds.length) {
        return c.json({ error: "包含未订阅或已停用的房间" }, 403);
    }

    const exp = Math.floor(Date.now() / 1000) + ttl;
    const payload: QueryKeyPayload = {
        exp,
        jti: crypto.randomUUID(),
        rids: roomIds,
        scope: QUERY_KEY_SCOPE,
        typ: QUERY_KEY_TYPE,
        uid: user.id,
    };

    const key = await sign(payload, getQuerySecret(c.env.JWT_SECRET), "HS256");
    return c.json({
        expires_at: toExpiresAt(exp),
        key,
        room_ids: roomIds,
        scope: QUERY_KEY_SCOPE,
        typ: QUERY_KEY_TYPE,
    });
});

app.get("/query", async c => {
    const token = getBearerToken(c.req.header("Authorization")) || c.req.query("key");
    if (!token) return c.json({ error: "缺少查询 Key" }, 401);

    let payload: unknown;
    try {
        payload = await verify(token, getQuerySecret(c.env.JWT_SECRET), "HS256");
    } catch {
        return c.json({ error: "查询 Key 无效或已过期" }, 401);
    }

    if (!isQueryPayload(payload)) return c.json({ error: "查询 Key 类型无效" }, 401);
    if (payload.exp <= Math.floor(Date.now() / 1000)) return c.json({ error: "查询 Key 无效或已过期" }, 401);

    const roomIds = normalizeRoomIds(payload.rids);
    if (roomIds.length === 0) return c.json({ rooms: [] });

    const placeholders = makePlaceholders(roomIds.length);
    const rooms = await c.env.DB.prepare(
        `
        SELECT
            r.id,
            r.full_name,
            r.last_electricity,
            r.last_query_status,
            r.next_query_time,
            s.alias_name,
            s.notification_threshold,
            s.is_active
        FROM subscriptions s
        JOIN rooms r ON s.room_id = r.id
        WHERE s.user_id = ?
          AND s.is_active = 1
          AND s.room_id IN (${placeholders})
        ORDER BY s.id ASC
    `
    )
        .bind(payload.uid, ...roomIds)
        .all<{
            alias_name: string | null;
            full_name: string | null;
            id: number;
            is_active: number;
            last_electricity: number | null;
            last_query_status: string | null;
            next_query_time: string | null;
            notification_threshold: number;
        }>();

    return c.json({
        rooms: rooms.results.map(room => ({
            ...room,
            unit: "kWh",
        })),
    });
});

export default app;
