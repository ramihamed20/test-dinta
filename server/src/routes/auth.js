import bcrypt from "bcryptjs";
import { Router } from "express";
import { db, toUser } from "../db/database.js";
import { defaultPlan } from "../db/seedData.js";
import { requireAuth, signToken } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/register", (req, res) => {
  const { name, email, password, year = "3rd year" } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(email);
  if (existing) {
    return res.status(409).json({ error: "Email is already registered" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare("INSERT INTO users (name, email, password_hash, year) VALUES (?, ?, ?, ?)")
    .run(name.trim(), email.trim().toLowerCase(), passwordHash, year);
  const planStmt = db.prepare("INSERT INTO study_plan_items (user_id, time, topic) VALUES (?, ?, ?)");
  defaultPlan.forEach(([time, topic]) => planStmt.run(result.lastInsertRowid, time, topic));
  const user = toUser(db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid));
  return res.status(201).json({ data: { user, token: signToken(user) } });
});

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const row = db.prepare("SELECT * FROM users WHERE lower(email) = lower(?)").get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const user = toUser(row);
  return res.json({ data: { user, token: signToken(user) } });
});

authRouter.get("/me", requireAuth, (req, res) => {
  return res.json({ data: req.user });
});

authRouter.put("/profile", requireAuth, (req, res) => {
  const { name, year } = req.body || {};
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: "Name must be at least 2 characters" });
  }
  db.prepare("UPDATE users SET name = ?, year = ? WHERE id = ?")
    .run(name.trim(), year || req.user.year, req.user.id);
  const updated = toUser(db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id));
  return res.json(updated);
});

authRouter.put("/profile/password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, row.password_hash)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.user.id);
  return res.json({ message: "Password updated" });
});
