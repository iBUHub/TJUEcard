export type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    AGENT_SECRET: string;

    // Email provider selection: "sendcloud" (default) or "resend"
    EMAIL_PROVIDER?: string;

    // SendCloud Email API
    SEND_CLOUD_API_USER: string;
    SEND_CLOUD_API_KEY: string;
    SEND_CLOUD_FROM_EMAIL: string;
    SEND_CLOUD_TEST_EMAIL: string;

    // Resend Email API
    RESEND_API_KEY?: string;

    // Development options
    SKIP_EMAIL_VERIFICATION?: string; // "true" to skip email verification in dev mode
    NODE_ENV?: string;
};

export type Variables = {
    user: {
        id: number;
        email: string;
        exp: number;
    };
};
