import { Hono } from "hono";
import { authMiddleware } from "../middlewares";
import { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const DEFAULT_NOTIFICATION_THRESHOLD = 20;
const DEFAULT_HISTORY_DAYS = 30;
const MAX_HISTORY_DAYS = 180;
const MAX_HISTORY_LIMIT = 2000;

app.use("*", authMiddleware);

function clampQueryNumber(value: string | undefined, fallback: number, min: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(Math.floor(parsed), min), max);
}

async function getUserRoom(
    db: D1Database,
    userId: number,
    roomId: number
): Promise<{
    alias_name: string | null;
    full_name: string | null;
    id: number;
    last_electricity: number | null;
    last_query_status: string | null;
    last_query_time: string | null;
    room_id: string;
} | null> {
    return db
        .prepare(
            `
        SELECT
            r.id,
            r.full_name,
            r.last_electricity,
            r.last_query_status,
            r.last_query_time,
            r.room_id,
            s.alias_name
        FROM subscriptions s
        JOIN rooms r ON s.room_id = r.id
        WHERE s.user_id = ?
          AND s.room_id = ?
    `
        )
        .bind(userId, roomId)
        .first<{
            alias_name: string | null;
            full_name: string | null;
            id: number;
            last_electricity: number | null;
            last_query_status: string | null;
            last_query_time: string | null;
            room_id: string;
        }>();
}

app.get("/", async c => {
    const user = c.get("user");
    const rooms = await c.env.DB.prepare(
        `
     SELECT r.*, s.alias_name, s.notification_threshold, s.is_active
     FROM subscriptions s
     JOIN rooms r ON s.room_id = r.id
     WHERE s.user_id = ?
   `
    )
        .bind(user.id)
        .all<unknown>();
    return c.json(rooms.results);
});

app.get("/:id/readings", async c => {
    const user = c.get("user");
    const roomId = Number(c.req.param("id"));
    if (!Number.isInteger(roomId) || roomId <= 0) return c.json({ error: "房间 ID 无效" }, 400);

    const days = clampQueryNumber(c.req.query("days"), DEFAULT_HISTORY_DAYS, 1, MAX_HISTORY_DAYS);
    const limit = clampQueryNumber(c.req.query("limit"), 500, 1, MAX_HISTORY_LIMIT);

    const room = await getUserRoom(c.env.DB, user.id, roomId);

    if (!room) return c.json({ error: "房间不存在或未订阅" }, 404);

    const readings = await c.env.DB.prepare(
        `
        SELECT
            r.id,
            r.electricity,
            r.recorded_at,
            ra.amount_cents AS recharge_amount_cents
        FROM readings r
        LEFT JOIN recharge_adjustments ra
          ON ra.room_id = r.room_id
         AND ra.reading_id = r.id
        WHERE r.room_id = ?
          AND r.recorded_at >= datetime('now', ?)
        ORDER BY r.recorded_at ASC
        LIMIT ?
    `
    )
        .bind(roomId, `-${days} days`, limit)
        .all<{ electricity: number; id: number; recorded_at: string; recharge_amount_cents: number | null }>();

    return c.json({
        days,
        readings: readings.results,
        room,
        unit: "kWh",
    });
});

app.put("/:id/readings/:readingId/recharge-adjustment", async c => {
    const user = c.get("user");
    const roomId = Number(c.req.param("id"));
    const readingId = Number(c.req.param("readingId"));
    if (!Number.isInteger(roomId) || roomId <= 0) return c.json({ error: "房间 ID 无效" }, 400);
    if (!Number.isInteger(readingId) || readingId <= 0) return c.json({ error: "读数 ID 无效" }, 400);

    const room = await getUserRoom(c.env.DB, user.id, roomId);
    if (!room) return c.json({ error: "房间不存在或未订阅" }, 404);

    const { amount_yuan } = await c.req.json();
    const amountYuan = Number(amount_yuan);
    if (!Number.isFinite(amountYuan) || amountYuan < 0) return c.json({ error: "充值金额无效" }, 400);

    const reading = await c.env.DB.prepare("SELECT id FROM readings WHERE id = ? AND room_id = ?")
        .bind(readingId, roomId)
        .first<{ id: number }>();
    if (!reading) return c.json({ error: "读数不存在" }, 404);

    const amountCents = Math.round(amountYuan * 100);
    await c.env.DB.prepare(
        `
        INSERT INTO recharge_adjustments (room_id, reading_id, amount_cents, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(room_id, reading_id) DO UPDATE SET
            amount_cents = excluded.amount_cents,
            updated_at = CURRENT_TIMESTAMP
    `
    )
        .bind(roomId, readingId, amountCents)
        .run();

    return c.json({
        amount_cents: amountCents,
        amount_yuan: amountCents / 100,
        reading_id: readingId,
    });
});

app.post("/", async c => {
    const user = c.get("user");
    const { system_id, area_id, building_id, floor_id, room_id, alias_name, notification_threshold, full_name } =
        await c.req.json();

    if (!system_id || !room_id) return c.json({ error: "缺少必要的房间参数" }, 400);

    // 1. Ensure Room exists
    try {
        await c.env.DB.prepare(
            `
         INSERT INTO rooms (system_id, area_id, building_id, floor_id, room_id, next_query_time, full_name)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
         ON CONFLICT(system_id, area_id, building_id, floor_id, room_id) DO UPDATE SET
            full_name = COALESCE(excluded.full_name, rooms.full_name)
       `
        )
            .bind(system_id, area_id, building_id, floor_id, room_id, full_name ?? null)
            .run();
    } catch (e) {
        console.error("Room insert error", e);
    }

    // Get Room ID
    const room = await c.env.DB.prepare(
        `
     SELECT id FROM rooms WHERE system_id=? AND area_id=? AND building_id=? AND floor_id=? AND room_id=?
   `
    )
        .bind(system_id, area_id, building_id, floor_id, room_id)
        .first<{ id: number }>();

    if (!room) return c.json({ error: "处理房间信息失败" }, 500);

    // 2. Create Subscription
    // Check limit before creating new subscription
    const existingActive = await c.env.DB.prepare(
        "SELECT id FROM subscriptions WHERE user_id = ? AND room_id = ? AND is_active = 1"
    )
        .bind(user.id, room.id)
        .first();

    if (!existingActive) {
        const stats = await c.env.DB.prepare(
            `SELECT 
                (SELECT max_subscriptions FROM users WHERE id = ?) as max_subs,
                (SELECT COUNT(*) FROM subscriptions WHERE user_id = ? AND is_active = 1) as current_count`
        )
            .bind(user.id, user.id)
            .first<{ max_subs: number | null; current_count: number }>();

        const limit = stats?.max_subs ?? 5;
        const current = stats?.current_count ?? 0;

        if (current >= limit) {
            return c.json({ error: `订阅数量已达上限 (${limit})，如需扩容请联系 tjuecard@ibuhub.com` }, 403);
        }
    }

    try {
        await c.env.DB.prepare(
            `
         INSERT INTO subscriptions (user_id, room_id, alias_name, notification_threshold)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, room_id) DO UPDATE SET
           alias_name = excluded.alias_name,
           notification_threshold = excluded.notification_threshold,
           is_active = 1
       `
        )
            .bind(user.id, room.id, alias_name, notification_threshold ?? DEFAULT_NOTIFICATION_THRESHOLD)
            .run();
    } catch (e) {
        return c.json({ error: "订阅失败: " + String(e) }, 500);
    }

    return c.json({ message: "房间添加成功", room_id: room.id });
});

app.patch("/:id/toggle", async c => {
    const user = c.get("user");
    const roomId = c.req.param("id");

    // Get current status
    const subscription = await c.env.DB.prepare("SELECT is_active FROM subscriptions WHERE user_id = ? AND room_id = ?")
        .bind(user.id, roomId)
        .first<{ is_active: number }>();

    if (!subscription) {
        return c.json({ error: "订阅不存在" }, 404);
    }

    const newStatus = subscription.is_active === 1 ? 0 : 1;

    // Toggle status
    await c.env.DB.prepare("UPDATE subscriptions SET is_active = ? WHERE user_id = ? AND room_id = ?")
        .bind(newStatus, user.id, roomId)
        .run();

    return c.json({ is_active: newStatus, message: newStatus === 1 ? "订阅已开启" : "订阅已关闭" });
});

app.delete("/:id", async c => {
    const user = c.get("user");
    const roomId = c.req.param("id");
    await c.env.DB.prepare("DELETE FROM subscriptions WHERE user_id = ? AND room_id = ?").bind(user.id, roomId).run();
    return c.json({ message: "房间已取消订阅" });
});

app.put("/:id", async c => {
    const user = c.get("user");
    const oldRoomId = c.req.param("id");
    const { system_id, area_id, building_id, floor_id, room_id, alias_name, notification_threshold, full_name } =
        await c.req.json();

    if (!system_id || !room_id) return c.json({ error: "缺少必要的房间参数" }, 400);

    // 1. Ensure Target Room exists
    try {
        await c.env.DB.prepare(
            `
         INSERT INTO rooms (system_id, area_id, building_id, floor_id, room_id, next_query_time, full_name)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
         ON CONFLICT(system_id, area_id, building_id, floor_id, room_id) DO UPDATE SET
            full_name = COALESCE(excluded.full_name, rooms.full_name)
       `
        )
            .bind(system_id, area_id, building_id, floor_id, room_id, full_name ?? null)
            .run();
    } catch (e) {
        console.error("Room insert error", e);
    }

    // Get Target Room ID
    const targetRoom = await c.env.DB.prepare(
        `
     SELECT id FROM rooms WHERE system_id=? AND area_id=? AND building_id=? AND floor_id=? AND room_id=?
   `
    )
        .bind(system_id, area_id, building_id, floor_id, room_id)
        .first<{ id: number }>();

    if (!targetRoom) return c.json({ error: "处理房间信息失败" }, 500);

    // 2. Update Subscription
    if (String(targetRoom.id) === String(oldRoomId)) {
        // Same room, just update settings
        await c.env.DB.prepare(
            `
            UPDATE subscriptions 
            SET alias_name = ?, notification_threshold = ?
            WHERE user_id = ? AND room_id = ?
            `
        )
            .bind(alias_name, notification_threshold ?? DEFAULT_NOTIFICATION_THRESHOLD, user.id, oldRoomId)
            .run();
    } else {
        // Different room, atomic switch
        const batch = [
            // Delete old
            c.env.DB.prepare("DELETE FROM subscriptions WHERE user_id = ? AND room_id = ?").bind(user.id, oldRoomId),
            // Insert new (upsert)
            c.env.DB.prepare(
                `
                INSERT INTO subscriptions (user_id, room_id, alias_name, notification_threshold)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, room_id) DO UPDATE SET
                    alias_name = excluded.alias_name,
                    notification_threshold = excluded.notification_threshold,
                    is_active = 1
                `
            ).bind(user.id, targetRoom.id, alias_name, notification_threshold ?? DEFAULT_NOTIFICATION_THRESHOLD),
        ];
        await c.env.DB.batch(batch);
    }

    return c.json({ message: "订阅更新成功", room_id: targetRoom.id });
});

export default app;
