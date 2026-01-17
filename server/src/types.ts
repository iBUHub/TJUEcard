export type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    AGENT_SECRET: string;

    // SendCloud Email API
    SEND_CLOUD_API_USER: string;
    SEND_CLOUD_API_KEY: string;
    SEND_CLOUD_FROM_EMAIL: string;
    SEND_CLOUD_TEST_EMAIL: string;
};

export type Variables = {
    user: {
        id: number;
        email: string;
        exp: number;
    };
};
