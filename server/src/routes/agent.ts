import { Hono } from "hono";
import { Context } from "hono";
import { Bindings, Variables } from "../types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Generate beautiful HTML email template for low electricity alert
 */
function generateEmailHtml(roomName: string, electric: number, threshold: number): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 16px;">⚡</div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">电费余额不足提醒</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                您好，您订阅的房间电量已低于设定的预警阈值，请及时充值以避免断电。
                            </p>
                            <!-- Stats Card -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
                                <tr>
                                    <td style="width: 50%; padding: 20px; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%); border-radius: 12px 0 0 12px; text-align: center;">
                                        <div style="color: rgba(255,255,255,0.9); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">当前电量</div>
                                        <div style="color: #ffffff; font-size: 32px; font-weight: 700;">${electric}<span style="font-size: 16px; font-weight: 400;"> 度</span></div>
                                    </td>
                                    <td style="width: 50%; padding: 20px; background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%); border-radius: 0 12px 12px 0; text-align: center;">
                                        <div style="color: rgba(255,255,255,0.9); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">预警阈值</div>
                                        <div style="color: #ffffff; font-size: 32px; font-weight: 700;">${threshold}<span style="font-size: 16px; font-weight: 400;"> 度</span></div>
                                    </td>
                                </tr>
                            </table>
                            <!-- Room Info -->
                            ${roomName ? `<p style="color: #666; font-size: 14px; margin: 0 0 24px; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;"><strong>房间：</strong>${roomName}</p>` : ""}
                            <!-- CTA -->
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
                                建议您尽快前往充值，以确保用电不受影响。
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background: #f8f9fa; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                                此邮件由 <strong style="color: #667eea;">TJUEcard</strong> 系统自动发送，请勿回复。<br>
                                如需调整通知设置，请访问 TJUEcard 管理页面。
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Send email notification via SendCloud API
 */
async function sendEmail(env: Bindings, to: string, subject: string, html: string): Promise<boolean> {
    if (!env.SEND_CLOUD_API_USER || !env.SEND_CLOUD_API_KEY) {
        console.warn("[SendCloud] API credentials not configured, skipping email");
        return false;
    }

    const params = new URLSearchParams({
        apiKey: env.SEND_CLOUD_API_KEY,
        apiUser: env.SEND_CLOUD_API_USER,
        from: env.SEND_CLOUD_FROM_EMAIL || "noreply@tjuecard.ibuhub.com",
        fromName: "TJUEcard",
        html,
        subject,
        to,
    });

    try {
        const response = await fetch("https://api2.sendcloud.net/api/mail/send", {
            body: params.toString(),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            method: "POST",
        });
        const result = (await response.json()) as { result?: boolean; message?: string };
        console.log(`[SendCloud] Email to ${to}: ${JSON.stringify(result)}`);
        return result.result === true;
    } catch (error) {
        console.error(`[SendCloud] Failed to send email to ${to}:`, error);
        return false;
    }
}

/**
 * Update agent activity in the database (register or update last active time and IP)
 */
async function updateAgentActivity(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
    const agentUUID = c.req.header("X-Agent-UUID");
    if (!agentUUID) return;

    const now = Math.floor(Date.now() / 1000);
    // Get client IP from CF-Connecting-IP or X-Forwarded-For
    const clientIP = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() || null;

    // Upsert: insert if not exists, update if exists
    await c.env.DB.prepare(
        `
        INSERT INTO agents (uuid, last_active_at, last_ip, registered_at)
        VALUES (?, datetime(?, 'unixepoch'), ?, datetime(?, 'unixepoch'))
        ON CONFLICT(uuid) DO UPDATE SET
            last_active_at = excluded.last_active_at,
            last_ip = excluded.last_ip
    `
    )
        .bind(agentUUID, now, clientIP, now)
        .run();
}

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

// Test email endpoint (returns full API response for debugging)
app.post("/test-email", async c => {
    const testEmail = c.env.SEND_CLOUD_TEST_EMAIL || "hello@ibuhub.com";

    if (!c.env.SEND_CLOUD_API_USER || !c.env.SEND_CLOUD_API_KEY) {
        return c.json({ error: "SendCloud API credentials not configured" }, 500);
    }

    const subject = "⚡ TJUEcard 邮件功能测试";
    const html = generateEmailHtml("测试房间（Test Room）", 8.5, 20);

    const params = new URLSearchParams({
        apiKey: c.env.SEND_CLOUD_API_KEY,
        apiUser: c.env.SEND_CLOUD_API_USER,
        from: c.env.SEND_CLOUD_FROM_EMAIL || "noreply@tjuecard.ibuhub.com",
        fromName: "TJUEcard",
        html,
        subject,
        to: testEmail,
    });

    try {
        const response = await fetch("https://api2.sendcloud.net/api/mail/send", {
            body: params.toString(),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            method: "POST",
        });
        const result = await response.json();
        return c.json({ apiResponse: result, to: testEmail });
    } catch (error) {
        return c.json({ error: String(error), to: testEmail }, 500);
    }
});

app.post("/poll", async c => {
    // Update agent activity in background
    c.executionCtx.waitUntil(updateAgentActivity(c));

    const limit = 5;
    const now = Math.floor(Date.now() / 1000);

    // Find tasks: overdue AND (not locked OR lock expired)
    // eslint-disable-next-line
    const pending = await c.env.DB.prepare(
        `
        SELECT * FROM rooms r
        WHERE (unixepoch(next_query_time) < ?) 
          AND (lock_agent_id IS NULL OR unixepoch(lock_expires_at) < ?)
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
            SET lock_agent_id = ?, lock_expires_at = datetime(?, 'unixepoch') 
            WHERE id = ? AND (lock_agent_id IS NULL OR unixepoch(lock_expires_at) < ?)
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
    // Update agent activity in background
    c.executionCtx.waitUntil(updateAgentActivity(c));

    const { room_id, success, electricity, message } = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const nextTime = now + 43200; // 12 hours later

    const batch = [
        c.env.DB.prepare(
            `
        UPDATE rooms 
        SET 
            last_query_time = datetime(?, 'unixepoch'),
            last_query_status = ?,
            last_electricity = ?,
            last_message = ?,
            next_query_time = datetime(?, 'unixepoch'),
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

        // Increment completed_tasks for the agent
        const agentUUID = c.req.header("X-Agent-UUID");
        if (agentUUID) {
            batch.push(
                c.env.DB.prepare("UPDATE agents SET completed_tasks = completed_tasks + 1 WHERE uuid = ?").bind(
                    agentUUID
                )
            );
        }
    }

    await c.env.DB.batch(batch);

    if (success && electricity !== null) {
        c.executionCtx.waitUntil(checkAndNotify(c.env, room_id, electricity));
    }

    return c.json({ message: "Submitted" });
});

async function checkAndNotify(env: Bindings, roomId: number, electric: number) {
    // Get room name for email
    const room = await env.DB.prepare("SELECT full_name FROM rooms WHERE id = ?")
        .bind(roomId)
        .first<{ full_name: string | null }>();
    const roomName = room?.full_name || "";

    const subs = await env.DB.prepare(
        `
        SELECT u.email, s.notification_threshold, unixepoch(s.last_notified_at) as last_notified_at, s.user_id
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE s.room_id = ? AND s.is_active = 1 AND s.notification_threshold != -1
    `
    )
        .bind(roomId)
        .all<{ email: string; notification_threshold: number; last_notified_at: number | null; user_id: number }>();

    const now = Math.floor(Date.now() / 1000);
    const COOLDOWN = 43200; // 12 hours in seconds

    for (const sub of subs.results) {
        let shouldNotify = false;

        if (!sub.last_notified_at) {
            shouldNotify = true;
        } else {
            const last = sub.last_notified_at; // It's a number now (converted by unixepoch())
            if (now - last > COOLDOWN) shouldNotify = true;
        }

        if (electric < sub.notification_threshold && shouldNotify) {
            console.log(
                `[Email Alert] To: ${sub.email} | Room: ${roomName} | Level: ${electric} < ${sub.notification_threshold}`
            );

            const subject = "⚡ TJUEcard 电费余额不足提醒";
            const html = generateEmailHtml(roomName, electric, sub.notification_threshold);
            const sent = await sendEmail(env, sub.email, subject, html);

            if (sent) {
                // Update last_notified_at only if email was sent successfully
                await env.DB.prepare(
                    "UPDATE subscriptions SET last_notified_at = datetime(?, 'unixepoch') WHERE user_id = ? AND room_id = ?"
                )
                    .bind(now, sub.user_id, roomId)
                    .run();
            }
        }
    }
}

export default app;
