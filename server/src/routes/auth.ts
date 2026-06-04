import { Hono } from "hono";
import { sign } from "hono/jwt";
import { hashSync, compareSync } from "bcryptjs";
import { Bindings, Variables } from "../types";

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Generate beautiful HTML email template for verification code
 */
function generateVerificationEmailHtml(code: string, type: "register" | "reset" = "register"): string {
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
                            <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">邮箱验证码</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                ${
                                    type === "register"
                                        ? "您好，您正在注册 TJUEcard 电量监控系统，请使用以下验证码完成注册："
                                        : "您好，您正在重置 TJUEcard 电量监控系统的密码，请使用以下验证码："
                                }
                            </p>
                            <!-- Verification Code -->
                            <div style="text-align: center; margin: 32px 0;">
                                <div style="display: inline-block; padding: 20px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);">
                                    <span style="color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</span>
                                </div>
                            </div>
                            <!-- Notice -->
                            <p style="color: #666; font-size: 14px; margin: 0 0 16px; padding: 16px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                                <strong>⏰ 温馨提示：</strong>验证码有效期为 5 分钟，请尽快使用。
                            </p>
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
                                如果您没有进行此操作，请忽略此邮件。
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background: #f8f9fa; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                                此邮件由 <a href="https://github.com/iBUHub/TJUEcard" style="color: #667eea; text-decoration: none; font-weight: bold;">TJUEcard</a> 系统自动发送，请勿回复。<br>
                                如需帮助，请访问 <a href="https://tjuecard.ibuhub.com/" style="color: #667eea; text-decoration: none; font-weight: bold;">TJUEcard 管理页面</a>。
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
 * Generate a random 6-digit verification code
 */
function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function isNumericTjuEmail(email: string): boolean {
    return /^\d+@tju\.edu\.cn$/.test(email);
}

// Send verification code endpoint
auth.post("/send-verification", async c => {
    const { email: rawEmail } = await c.req.json<{ email: string }>();

    if (!rawEmail) return c.json({ error: "请输入邮箱" }, 400);

    const email = normalizeEmail(rawEmail);

    if (!isNumericTjuEmail(email)) {
        return c.json({ error: "仅支持数字 @tju.edu.cn 邮箱注册" }, 400);
    }

    // Check if user already exists
    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) {
        return c.json({ error: "该邮箱已被注册" }, 409);
    }

    const now = Math.floor(Date.now() / 1000);

    // Check if a verification code was sent within the last 60 seconds
    const recent = await c.env.DB.prepare(
        "SELECT id FROM email_verifications WHERE email = ? AND unixepoch(created_at) > ? LIMIT 1"
    )
        .bind(email, now - 60)
        .first();

    if (recent) {
        return c.json({ error: "请等待 60 秒后再重新发送验证码" }, 429);
    }

    // Delete old verification codes for this email
    await c.env.DB.prepare("DELETE FROM email_verifications WHERE email = ?").bind(email).run();

    // Generate new verification code
    const code = generateVerificationCode();
    const expiresAt = now + 300; // 5 minutes

    // Store the verification code
    await c.env.DB.prepare(
        "INSERT INTO email_verifications (email, code, expires_at, created_at) VALUES (?, ?, datetime(?, 'unixepoch'), datetime(?, 'unixepoch'))"
    )
        .bind(email, code, expiresAt, now)
        .run();

    // Send verification email
    const subject = "🔐 TJUEcard 邮箱验证码";
    const html = generateVerificationEmailHtml(code);
    const sent = await sendEmail(c.env, email, subject, html);

    // If skip email verification is enabled (local dev mode), return success even if email fails
    const skipEmailVerification = c.env.SKIP_EMAIL_VERIFICATION === "true" && c.env.NODE_ENV !== "production";
    if (!sent && !skipEmailVerification) {
        return c.json({ error: "验证码邮件发送失败" }, 500);
    }

    // Local dev mode: return verification code for debugging
    if (skipEmailVerification) {
        console.log(`[DEV MODE] Verification code for ${email}: ${code}`);
        return c.json({
            dev_code: code,
            message: "验证码已发送",
        });
    }

    return c.json({ message: "验证码已发送" });
});

auth.post("/register", async c => {
    const { email: rawEmail, password, code } = await c.req.json<{ email: string; password: string; code: string }>();

    if (!rawEmail || !password) return c.json({ error: "邮箱和密码不能为空" }, 400);
    if (!code) return c.json({ error: "验证码不能为空" }, 400);

    const email = normalizeEmail(rawEmail);

    if (!isNumericTjuEmail(email)) {
        return c.json({ error: "仅支持数字 @tju.edu.cn 邮箱注册" }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    // Local dev mode: skip verification code validation
    const skipEmailVerification = c.env.SKIP_EMAIL_VERIFICATION === "true" && c.env.NODE_ENV !== "production";

    let verificationId: number | null = null;

    if (!skipEmailVerification) {
        // Verify the verification code
        const verification = await c.env.DB.prepare(
            "SELECT id, code FROM email_verifications WHERE email = ? AND unixepoch(expires_at) > ? ORDER BY created_at DESC LIMIT 1"
        )
            .bind(email, now)
            .first<{ id: number; code: string }>();

        if (!verification) {
            return c.json({ error: "验证码不存在或已过期" }, 400);
        }

        if (verification.code !== code) {
            return c.json({ error: "验证码错误" }, 400);
        }

        verificationId = verification.id;
    } else {
        console.log(`[DEV MODE] Skipping email verification for ${email}`);
    }

    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) {
        return c.json({ error: "该邮箱已被注册" }, 409);
    }

    const passwordHash = hashSync(password, 10);

    try {
        const res = await c.env.DB.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
            // eslint-disable-next-line
            .bind(email, passwordHash)
            .run();

        if (res.success) {
            // Delete used verification code (only if verification was performed)
            if (verificationId) {
                await c.env.DB.prepare("DELETE FROM email_verifications WHERE id = ?").bind(verificationId).run();
            }
            return c.json({ message: "注册成功" }, 201);
        } else {
            return c.json({ error: "注册失败" }, 500);
        }
    } catch (e) {
        return c.json({ error: String(e) }, 500);
    }
});

auth.post("/login", async c => {
    const { email, password } = await c.req.json<{ email: string; password: string }>();

    const user = (await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first()) as {
        id: number;
        email: string;
        password_hash: string;
    } | null;

    if (!user) return c.json({ error: "邮箱或密码错误" }, 401);

    if (!compareSync(password, user.password_hash)) {
        return c.json({ error: "邮箱或密码错误" }, 401);
    }

    if (!c.env.JWT_SECRET) {
        return c.json({ error: "服务器内部错误：JWT_SECRET 未配置" }, 500);
    }

    const token = await sign(
        { email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, id: user.id },
        c.env.JWT_SECRET
    );

    return c.json({ token, user: { email: user.email, id: user.id } });
});

// Send reset password verification code endpoint
auth.post("/send-reset-code", async c => {
    const { email } = await c.req.json<{ email: string }>();

    if (!email) return c.json({ error: "请输入邮箱" }, 400);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return c.json({ error: "邮箱格式不正确" }, 400);
    }

    // Validate email domain - only allow tju.edu.cn
    if (!email.toLowerCase().endsWith("@tju.edu.cn")) {
        return c.json({ error: "仅支持 @tju.edu.cn 邮箱" }, 400);
    }

    // Check if user exists (Must exist for password reset)
    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (!existing) {
        return c.json({ error: "该邮箱未注册" }, 404);
    }

    const now = Math.floor(Date.now() / 1000);

    // Check if a verification code was sent within the last 60 seconds
    const recent = await c.env.DB.prepare(
        "SELECT id FROM email_verifications WHERE email = ? AND unixepoch(created_at) > ? LIMIT 1"
    )
        .bind(email, now - 60)
        .first();

    if (recent) {
        return c.json({ error: "请等待 60 秒后再重新发送验证码" }, 429);
    }

    // Delete old verification codes for this email
    await c.env.DB.prepare("DELETE FROM email_verifications WHERE email = ?").bind(email).run();

    // Generate new verification code
    const code = generateVerificationCode();
    const expiresAt = now + 300; // 5 minutes

    // Store the verification code
    await c.env.DB.prepare(
        "INSERT INTO email_verifications (email, code, expires_at, created_at) VALUES (?, ?, datetime(?, 'unixepoch'), datetime(?, 'unixepoch'))"
    )
        .bind(email, code, expiresAt, now)
        .run();

    // Send verification email
    const subject = "🔐 TJUEcard 重置密码验证码";
    const html = generateVerificationEmailHtml(code, "reset");
    const sent = await sendEmail(c.env, email, subject, html);

    // If skip email verification is enabled (local dev mode), return success even if email fails
    const skipEmailVerification = c.env.SKIP_EMAIL_VERIFICATION === "true" && c.env.NODE_ENV !== "production";
    if (!sent && !skipEmailVerification) {
        return c.json({ error: "Failed to send verification email" }, 500);
    }

    // Local dev mode: return verification code for debugging
    if (skipEmailVerification) {
        console.log(`[DEV MODE] Reset code for ${email}: ${code}`);
        return c.json({
            dev_code: code,
            message: "重置验证码已发送",
        });
    }

    return c.json({ message: "重置验证码已发送" });
});

// Reset password endpoint
auth.post("/reset", async c => {
    const { email, password, code } = await c.req.json<{ email: string; password: string; code: string }>();

    if (!email || !password) return c.json({ error: "邮箱和密码不能为空" }, 400);
    if (!code) return c.json({ error: "验证码不能为空" }, 400);

    // Validate email domain - only allow tju.edu.cn
    if (!email.toLowerCase().endsWith("@tju.edu.cn")) {
        return c.json({ error: "仅支持 @tju.edu.cn 邮箱" }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    // Local dev mode: skip verification code validation
    const skipEmailVerification = c.env.SKIP_EMAIL_VERIFICATION === "true" && c.env.NODE_ENV !== "production";

    let verificationId: number | null = null;

    if (!skipEmailVerification) {
        // Verify the verification code
        const verification = await c.env.DB.prepare(
            "SELECT id, code FROM email_verifications WHERE email = ? AND unixepoch(expires_at) > ? ORDER BY created_at DESC LIMIT 1"
        )
            .bind(email, now)
            .first<{ id: number; code: string }>();

        if (!verification) {
            return c.json({ error: "验证码不存在或已过期" }, 400);
        }

        if (verification.code !== code) {
            return c.json({ error: "验证码错误" }, 400);
        }

        verificationId = verification.id;
    } else {
        console.log(`[DEV MODE] Skipping email verification (reset) for ${email}`);
    }

    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (!existing) {
        return c.json({ error: "该邮箱未注册" }, 404);
    }

    const passwordHash = hashSync(password, 10);

    try {
        const res = await c.env.DB.prepare("UPDATE users SET password_hash = ? WHERE email = ?")
            // eslint-disable-next-line
            .bind(passwordHash, email)
            .run();

        if (res.success) {
            // Delete used verification code (only if verification was performed)
            if (verificationId) {
                await c.env.DB.prepare("DELETE FROM email_verifications WHERE id = ?").bind(verificationId).run();
            }
            return c.json({ message: "密码重置成功" });
        } else {
            return c.json({ error: "重置密码失败" }, 500);
        }
    } catch (e) {
        return c.json({ error: String(e) }, 500);
    }
});

export default auth;
