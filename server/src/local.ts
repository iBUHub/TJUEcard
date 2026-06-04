import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import rooms from "./routes/rooms";
import agent from "./routes/agent";
import electricity from "./routes/electricity";
import user from "./routes/user";
import { getLocalDb, D1Adapter } from "./db";

// Load environment variables
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load server/.env file
dotenv.config({ path: join(__dirname, "../../.env") });

// Initialize local database
const localDb = getLocalDb("./tjuecard.db");
const d1Adapter = new D1Adapter(localDb.getDb());

// Define environment variable types
type Bindings = {
    DB: D1Adapter;
    JWT_SECRET: string;
    AGENT_SECRET: string;
    SEND_CLOUD_API_USER: string;
    SEND_CLOUD_API_KEY: string;
    SEND_CLOUD_FROM_EMAIL: string;
    SEND_CLOUD_TEST_EMAIL: string;
    SKIP_EMAIL_VERIFICATION?: string;
    NODE_ENV?: string;
};

// Create Hono application
const app = new Hono<{ Bindings: Bindings }>();

// Middleware: Inject database and environment variables
app.use("*", async (c, next) => {
    // Simulate Cloudflare Workers environment
    c.env = {
        AGENT_SECRET: process.env.AGENT_SECRET || "dev-agent-secret",
        DB: d1Adapter,
        JWT_SECRET: process.env.JWT_SECRET || "dev-secret-key-change-in-production",
        NODE_ENV: "development",
        SEND_CLOUD_API_KEY: process.env.SEND_CLOUD_API_KEY || "",
        SEND_CLOUD_API_USER: process.env.SEND_CLOUD_API_USER || "",
        SEND_CLOUD_FROM_EMAIL: process.env.SEND_CLOUD_FROM_EMAIL || "noreply@tjuecard.ibuhub.com",
        SEND_CLOUD_TEST_EMAIL: process.env.SEND_CLOUD_TEST_EMAIL || "hello@ibuhub.com",
        SKIP_EMAIL_VERIFICATION: process.env.SKIP_EMAIL_VERIFICATION,
    };

    await next();
});

// CORS middleware
app.use("*", cors());

// Routes
app.get("/", c => {
    return c.text("TJUEcard Server is running (Local Development Mode)!");
});

app.route("/auth", auth);
app.route("/rooms", rooms);
app.route("/electricity", electricity);
app.route("/agent", agent);
app.route("/user", user);

// Start the server
const port = 3000;

console.log("🚀 TJUEcard Server starting...");
console.log(`📍 Port: ${port}`);
console.log("🗄️  Database: SQLite (Local Mode)");

// Show development mode status
if (process.env.SKIP_EMAIL_VERIFICATION === "true") {
    console.log("🔓 Dev Mode: Enabled (Skip email verification)");
} else {
    console.log("🔒 Email Verification: Enabled");
}

serve({
    fetch: app.fetch,
    port,
});

console.log(`✅ Server started: http://localhost:${port}`);

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("\n👋 Closing server...");
    localDb.close();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n👋 Closing server...");
    localDb.close();
    process.exit(0);
});
