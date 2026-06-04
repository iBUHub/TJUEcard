import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import rooms from "./routes/rooms";
import agent from "./routes/agent";
import electricity from "./routes/electricity";
import user from "./routes/user";
import { Bindings, Variables } from "./types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", cors());

app.get("/", c => {
    return c.text("TJUEcard Server is running!");
});

app.route("/auth", auth);
app.route("/rooms", rooms);
app.route("/electricity", electricity);
app.route("/agent", agent);
app.route("/user", user);

export default app;
