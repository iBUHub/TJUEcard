import { Hono } from "hono";
import { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware for Agent Secret
app.use("*", async (c, next) => {
    if (!c.env.AGENT_SECRET) {
        return c.json({ error: "Server configuration error: AGENT_SECRET is missing" }, 500);
    }
    const secret = c.req.header("X-Agent-Secret");
    if (secret !== c.env.AGENT_SECRET) {
        return c.json({ error: "Unauthorized Agent" }, 401);
    }
    await next();
});

app.post("/poll", async c => {
    const limit = 5;
    const now = Math.floor(Date.now() / 1000);

    // Find tasks: overdue AND (not locked OR lock expired)
    // eslint-disable-next-line
    const pending = await c.env.DB.prepare(
        `
        SELECT * FROM rooms r
        WHERE (next_query_time < ?) 
          AND (lock_agent_id IS NULL OR lock_expires_at < ?)
          AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.room_id = r.id AND s.is_active = 1)
        ORDER BY next_query_time ASC
        LIMIT ?
    `
    )
        .bind(now, now, limit)
        .all();

    const tasks: Record<string, unknown>[] = [];
    const agentId = crypto.randomUUID();

    // Try to lock items
    for (const room of pending.results) {
        const res = await c.env.DB.prepare(
            `
            UPDATE rooms 
            SET lock_agent_id = ?, lock_expires_at = ? 
            WHERE id = ? AND (lock_agent_id IS NULL OR lock_expires_at < ?)
        `
        )
            .bind(agentId, now + 300, room.id, now)
            .run();

        if (res.success && res.meta.changes > 0) {
            tasks.push(room);
        }
    }

    return c.json({ agentId, tasks });
});

app.post("/submit", async c => {
    const { room_id, success, electricity, message } = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const nextTime = now + 86400; // 24 hours later

    const batch = [
        c.env.DB.prepare(
            `
        UPDATE rooms 
        SET 
            last_query_time = ?,
            last_query_status = ?,
            last_electricity = ?,
            last_message = ?,
            next_query_time = ?,
            lock_agent_id = NULL
        WHERE id = ?
    `
        ).bind(now, success ? "success" : "failed", electricity, message, nextTime, room_id),
    ];

    if (success && electricity !== null) {
        batch.push(
            c.env.DB.prepare(
                "INSERT INTO readings (room_id, electricity, recorded_at) VALUES (?, ?, datetime(?, 'unixepoch'))"
            ).bind(room_id, electricity, now)
        );

        // 30 days retention
        const thirtyDaysAgo = now - 2592000;
        batch.push(
            c.env.DB.prepare("DELETE FROM readings WHERE room_id = ? AND recorded_at < datetime(?, 'unixepoch')").bind(
                room_id,
                thirtyDaysAgo
            )
        );
    }

    await c.env.DB.batch(batch);

    if (success && electricity !== null) {
        c.executionCtx.waitUntil(checkAndNotify(c.env, room_id, electricity));
    }

    return c.json({ message: "Submitted" });
});

async function checkAndNotify(env: Bindings, roomId: number, electric: number) {
    const subs = await env.DB.prepare(
        `
        SELECT u.email, s.notification_threshold, s.last_notified_at, s.user_id
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE s.room_id = ? AND s.is_active = 1 AND s.notification_threshold != -1
    `
    )

        .bind(roomId)
        .all<{ email: string; notification_threshold: number; last_notified_at: number | null; user_id: number }>();

    const now = Math.floor(Date.now() / 1000);
    const COOLDOWN = 86400; // 24 hours in seconds

    for (const sub of subs.results) {
        let shouldNotify = false;

        if (!sub.last_notified_at) {
            shouldNotify = true;
        } else {
            const last = sub.last_notified_at; // It's a number now
            if (now - last > COOLDOWN) shouldNotify = true;
        }

        if (electric < sub.notification_threshold && shouldNotify) {
            // Stub for email sending
            // In production: await fetch('https://api.mailchannels.net/tx/v1/send', ...)
            console.log(
                `[Email Alert] To: ${sub.email} | Room ID: ${roomId} | Level: ${electric} < ${sub.notification_threshold}`
            );

            // Update last_notified_at
            await env.DB.prepare("UPDATE subscriptions SET last_notified_at = ? WHERE user_id = ? AND room_id = ?")
                .bind(now, sub.user_id, roomId)
                .run();
        }
    }
}

export default app;
