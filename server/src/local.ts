import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import rooms from "./routes/rooms";
import agent from "./routes/agent";
import { getLocalDb, D1Adapter } from "./db";

// 加载环境变量
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 server/.env 文件
dotenv.config({ path: join(__dirname, "../../.env") });

// 初始化本地数据库
const localDb = getLocalDb("./tjuecard.db");
const d1Adapter = new D1Adapter(localDb.getDb());

// 定义环境变量类型
type Bindings = {
    DB: D1Adapter;
    JWT_SECRET: string;
    AGENT_SECRET: string;
    SEND_CLOUD_API_USER: string;
    SEND_CLOUD_API_KEY: string;
    SEND_CLOUD_FROM_EMAIL: string;
    SEND_CLOUD_TEST_EMAIL: string;
    SKIP_EMAIL_VERIFICATION?: string;
};

// 创建 Hono 应用
const app = new Hono<{ Bindings: Bindings }>();

// 中间件: 注入数据库和环境变量
app.use("*", async (c, next) => {
    // 模拟 Cloudflare Workers 的环境
    c.env = {
        AGENT_SECRET: process.env.AGENT_SECRET || "dev-agent-secret",
        DB: d1Adapter,
        JWT_SECRET: process.env.JWT_SECRET || "dev-secret-key-change-in-production",
        SEND_CLOUD_API_KEY: process.env.SEND_CLOUD_API_KEY || "",
        SEND_CLOUD_API_USER: process.env.SEND_CLOUD_API_USER || "",
        SEND_CLOUD_FROM_EMAIL: process.env.SEND_CLOUD_FROM_EMAIL || "noreply@tjuecard.ibuhub.com",
        SEND_CLOUD_TEST_EMAIL: process.env.SEND_CLOUD_TEST_EMAIL || "hello@ibuhub.com",
        SKIP_EMAIL_VERIFICATION: process.env.SKIP_EMAIL_VERIFICATION,
    };

    await next();
});

// CORS 中间件
app.use("*", cors());

// 路由
app.get("/", c => {
    return c.text("TJUEcard Server is running (Local Development Mode)!");
});

app.route("/auth", auth);
app.route("/rooms", rooms);
app.route("/agent", agent);

// 启动服务器
const port = parseInt(process.env.PORT || "3000", 10);

console.log("🚀 TJUEcard 服务器启动中...");
console.log(`📍 端口: ${port}`);
console.log("🗄️  数据库: SQLite (本地模式)");

// 显示开发模式状态
if (process.env.SKIP_EMAIL_VERIFICATION === "true") {
    console.log("🔓 开发模式: 已启用（跳过邮箱验证）");
} else {
    console.log("🔒 邮箱验证: 已启用");
}

serve({
    fetch: app.fetch,
    port,
});

console.log(`✅ 服务器已启动: http://localhost:${port}`);

// 优雅关闭
process.on("SIGINT", () => {
    console.log("\n👋 正在关闭服务器...");
    localDb.close();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n👋 正在关闭服务器...");
    localDb.close();
    process.exit(0);
});
