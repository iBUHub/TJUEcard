export type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    AGENT_SECRET: string;
};

export type Variables = {
    user: {
        id: number;
        email: string;
        exp: number;
    };
};
