import jwt from "jsonwebtoken";
import { db, toUser } from "../db/database.js";

const JWT_SECRET = process.env.JWT_SECRET || "dentify-dev-secret-change-me";

if (JWT_SECRET === "dentify-dev-secret-change-me") {
  console.warn("\n⚠️  WARNING: Using default JWT secret. Set JWT_SECRET in your .env for production!\n");
}

export function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "Invalid session" });
    }
    req.user = toUser(user);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
}
