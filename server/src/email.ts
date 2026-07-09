import { Bindings } from "./types";

export type EmailProvider = "sendcloud" | "resend";

export type EmailSendResult = {
    ok: boolean;
    provider: EmailProvider;
    status?: number;
    data?: unknown;
    error?: string;
};

const DEFAULT_FROM_EMAIL = "noreply@tjuecard.ibuhub.com";
const DEFAULT_FROM_NAME = "TJUEcard";
const DEFAULT_TEST_EMAIL = "hello@ibuhub.com";

function getEmailProvider(env: Bindings): EmailProvider {
    const provider = (env.EMAIL_PROVIDER || "sendcloud").trim().toLowerCase();
    if (provider === "resend") return "resend";
    if (provider !== "sendcloud") {
        console.warn(`[Email] Unsupported EMAIL_PROVIDER="${env.EMAIL_PROVIDER}", falling back to SendCloud`);
    }
    return "sendcloud";
}

export function getEmailTestRecipient(env: Bindings): string {
    return env.SEND_CLOUD_TEST_EMAIL?.trim() || DEFAULT_TEST_EMAIL;
}

function getSendCloudFromEmail(env: Bindings): string {
    return env.SEND_CLOUD_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;
}

function getResendFromEmail(env: Bindings): string {
    const from = env.SEND_CLOUD_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;
    if (from.includes("<") && from.includes(">")) return from;
    return `${DEFAULT_FROM_NAME} <${from}>`;
}

async function readResponseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

function getApiError(data: unknown, status: number): string {
    if (data && typeof data === "object") {
        const obj = data as { error?: unknown; message?: unknown; name?: unknown };
        if (typeof obj.message === "string") return obj.message;
        if (typeof obj.error === "string") return obj.error;
        if (typeof obj.name === "string") return obj.name;
    }

    if (typeof data === "string") return data;
    return `Email API returned HTTP ${status}`;
}

async function sendSendCloudEmail(env: Bindings, to: string, subject: string, html: string): Promise<EmailSendResult> {
    const apiUser = env.SEND_CLOUD_API_USER?.trim();
    const apiKey = env.SEND_CLOUD_API_KEY?.trim();

    if (!apiUser || !apiKey) {
        const error = "SendCloud API credentials not configured";
        console.warn(`[SendCloud] ${error}, skipping email`);
        return { error, ok: false, provider: "sendcloud" };
    }

    const params = new URLSearchParams({
        apiKey,
        apiUser,
        from: getSendCloudFromEmail(env),
        fromName: DEFAULT_FROM_NAME,
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
        const data = await readResponseBody(response);
        const sendCloudResult = data as { result?: boolean };
        const ok = response.ok && sendCloudResult?.result === true;

        console.log(`[SendCloud] Email to ${to}: ${JSON.stringify(data)}`);
        return {
            data,
            error: ok ? undefined : getApiError(data, response.status),
            ok,
            provider: "sendcloud",
            status: response.status,
        };
    } catch (error) {
        console.error(`[SendCloud] Failed to send email to ${to}:`, error);
        return { error: String(error), ok: false, provider: "sendcloud" };
    }
}

async function sendResendEmail(env: Bindings, to: string, subject: string, html: string): Promise<EmailSendResult> {
    const apiKey = env.RESEND_API_KEY?.trim();

    if (!apiKey) {
        const error = "Resend API key not configured";
        console.warn(`[Resend] ${error}, skipping email`);
        return { error, ok: false, provider: "resend" };
    }

    try {
        const response = await fetch("https://api.resend.com/emails", {
            body: JSON.stringify({
                from: getResendFromEmail(env),
                html,
                subject,
                to: [to],
            }),
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            method: "POST",
        });
        const data = await readResponseBody(response);
        const ok = response.ok;

        console.log(`[Resend] Email to ${to}: ${JSON.stringify(data)}`);
        return {
            data,
            error: ok ? undefined : getApiError(data, response.status),
            ok,
            provider: "resend",
            status: response.status,
        };
    } catch (error) {
        console.error(`[Resend] Failed to send email to ${to}:`, error);
        return { error: String(error), ok: false, provider: "resend" };
    }
}

export async function sendEmailDetailed(
    env: Bindings,
    to: string,
    subject: string,
    html: string
): Promise<EmailSendResult> {
    const provider = getEmailProvider(env);
    return provider === "resend" ? sendResendEmail(env, to, subject, html) : sendSendCloudEmail(env, to, subject, html);
}

export async function sendEmail(env: Bindings, to: string, subject: string, html: string): Promise<boolean> {
    const result = await sendEmailDetailed(env, to, subject, html);
    return result.ok;
}
