import { Hono } from "hono";
import { authMiddleware } from "../middlewares";
import { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", authMiddleware);

app.get("/", async c => {
    const user = c.get("user");
    const rooms = await c.env.DB.prepare(
        `
     SELECT r.*, s.alias_name, s.notification_threshold 
     FROM subscriptions s 
     JOIN rooms r ON s.room_id = r.id 
     WHERE s.user_id = ? AND s.is_active = 1
   `
    )
        .bind(user.id)
        .all<unknown>();
    return c.json(rooms.results);
});

app.post("/", async c => {
    const user = c.get("user");
    const { system_id, area_id, building_id, floor_id, room_id, alias_name, notification_threshold } =
        await c.req.json();

    if (!system_id || !room_id) return c.json({ error: "Missing required room parameters" }, 400);

    // 1. Ensure Room exists
    try {
        await c.env.DB.prepare(
            `
         INSERT OR IGNORE INTO rooms (system_id, area_id, building_id, floor_id, room_id, next_query_time)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
       `
        )
            .bind(system_id, area_id, building_id, floor_id, room_id)
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

    if (!room) return c.json({ error: "Failed to process room" }, 500);

    // 2. Create Subscription
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
        return c.json({ error: "Failed to subscribe: " + String(e) }, 500);
    }

    return c.json({ message: "Room added", room_id: room.id });
});

app.delete("/:id", async c => {
    const user = c.get("user");
    const roomId = c.req.param("id");
    await c.env.DB.prepare("DELETE FROM subscriptions WHERE user_id = ? AND room_id = ?").bind(user.id, roomId).run();
    return c.json({ message: "Room unsubscribed" });
});

export default app;
