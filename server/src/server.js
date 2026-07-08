import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { migrate } from "./db/database.js";
import { seed } from "./db/seed.js";
import { requireAuth } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { authRouter } from "./routes/auth.js";
import { platformRouter } from "./routes/platform.js";

const app = express();
const port = Number(process.env.PORT || 4000);

migrate();
seed();

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ data: { ok: true, name: "Dentify API" } });
});
app.use("/api/auth", rateLimit, authRouter);
app.put("/api/profile", requireAuth, (req, res, next) => { req.url = "/profile"; authRouter.handle(req, res, next); });
app.put("/api/profile/password", requireAuth, (req, res, next) => { req.url = "/profile/password"; authRouter.handle(req, res, next); });
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ data: req.user });
});
app.use("/api", platformRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Dentify API listening on http://localhost:${port}`);
});
