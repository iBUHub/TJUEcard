import { Hono } from "hono";
import { authMiddleware } from "../middlewares";
import { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", authMiddleware);

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
            .bind(user.id, room.id, alias_name, notification_threshold ?? -1)
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
            .bind(alias_name, notification_threshold ?? -1, user.id, oldRoomId)
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
            ).bind(user.id, targetRoom.id, alias_name, notification_threshold ?? -1),
        ];
        await c.env.DB.batch(batch);
    }

    return c.json({ message: "订阅更新成功", room_id: targetRoom.id });
});

export default app;
