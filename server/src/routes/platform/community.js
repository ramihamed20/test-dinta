import { Router } from "express";
import { db } from "../../db/database.js";

export const communityRouter = Router();

communityRouter.get("/community", (req, res) => {
  const posts = db
    .prepare(`
      SELECT
        p.id,
        p.body,
        p.tag,
        p.likes,
        p.replies,
        p.created_at AS createdAt,
        u.name AS author,
        u.year AS year,
        EXISTS(SELECT 1 FROM community_likes WHERE user_id = ? AND post_id = p.id) AS liked
      FROM community_posts p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 100
    `)
    .all(req.user.id);
  const announcements = db
    .prepare("SELECT id, title, body, tone AS tag, created_at AS createdAt FROM announcements ORDER BY created_at DESC LIMIT 5")
    .all();

  return res.json({ data: { posts, announcements } });
});

communityRouter.post("/community/posts", (req, res) => {
  let body = String(req.body?.body || "").trim();
  const tag = String(req.body?.tag || "Question").trim().slice(0, 24) || "Question";
  if (body.length < 4) return res.status(400).json({ error: "Post body is too short" });
  if (body.length > 420) return res.status(400).json({ error: "Post body must be under 420 characters" });

  // Sanitize HTML to prevent XSS
  body = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const result = db
    .prepare("INSERT INTO community_posts (user_id, body, tag) VALUES (?, ?, ?)")
    .run(req.user.id, body, tag);
  const post = db
    .prepare(`
      SELECT
        p.id,
        p.body,
        p.tag,
        p.likes,
        p.replies,
        p.created_at AS createdAt,
        u.name AS author,
        u.year AS year
      FROM community_posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = ?
    `)
    .get(result.lastInsertRowid);

  return res.status(201).json({ data: post });
});

communityRouter.delete("/community/posts/:id", (req, res) => {
  db.prepare("DELETE FROM community_posts WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  return res.json({ message: "Post deleted" });
});
