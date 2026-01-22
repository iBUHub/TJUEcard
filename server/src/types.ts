export type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    AGENT_SECRET: string;

    // SendCloud Email API
    SEND_CLOUD_API_USER: string;
    SEND_CLOUD_API_KEY: string;
    SEND_CLOUD_FROM_EMAIL: string;
    SEND_CLOUD_TEST_EMAIL: string;

    // Development options
    SKIP_EMAIL_VERIFICATION?: string; // "true" to skip email verification in dev mode
};

export type Variables = {
    user: {
        id: number;
        email: string;
        exp: number;
    };
};
