import { Router } from "express";
import { db } from "../../db/database.js";

export const bookmarksRouter = Router();

bookmarksRouter.get("/review", (req, res) => {
  const rows = db
    .prepare(`
      SELECT
        r.id,
        r.type,
        r.target_id AS targetId,
        r.reason,
        r.due_at AS dueAt,
        q.prompt AS questionText,
        q.choices_json AS choicesJson,
        q.explanation,
        mat.title AS materialTitle
      FROM review_items r
      JOIN questions q ON q.id = r.target_id AND r.type = 'question'
      JOIN materials mat ON mat.id = q.material_id
      WHERE r.user_id = ?
        AND r.completed_at IS NULL
        AND datetime(r.due_at) <= datetime('now')
      ORDER BY r.due_at
    `)
    .all(req.user.id);
  const data = rows.map((row) => ({
    id: row.id,
    type: row.type,
    targetId: row.targetId,
    reason: row.reason,
    dueAt: row.dueAt,
    due_at: row.dueAt,
    prompt: row.questionText,
    question: {
      id: row.targetId,
      prompt: row.questionText,
      explanation: row.explanation,
      materialTitle: row.materialTitle,
      choices: JSON.parse(row.choicesJson)
    }
  }));
  return res.json({ data });
});

bookmarksRouter.post("/review/:id/complete", (req, res) => {
  const { correct } = req.body || {};
  const row = db.prepare("SELECT * FROM review_items WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Review item not found" });

  if (correct) {
    db.prepare("UPDATE review_items SET completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
  } else {
    // Spaced repetition logic: push due date further out
    db.prepare("UPDATE review_items SET due_at = datetime('now', '+24 hours') WHERE id = ?").run(row.id);
  }

  return res.json({ message: "Completed" });
});

bookmarksRouter.post("/bookmarks", (req, res) => {
  const { type, targetId } = req.body || {};
  if (!type || !targetId) return res.status(400).json({ error: "Type and targetId are required" });

  db.prepare(`
    INSERT OR IGNORE INTO bookmarks (user_id, type, target_id)
    VALUES (?, ?, ?)
  `).run(req.user.id, type, targetId);

  return res.status(201).json({ message: "Bookmarked" });
});

bookmarksRouter.delete("/bookmarks/:id", (req, res) => {
  // Can delete by bookmarked target id or bookmark item id
  db.prepare("DELETE FROM bookmarks WHERE user_id = ? AND (id = ? OR (type = 'question' AND target_id = ?))")
    .run(req.user.id, req.params.id, req.params.id);
  return res.json({ message: "Deleted" });
});

bookmarksRouter.get("/bookmarks", (req, res) => {
  const rows = db
    .prepare(`
      SELECT
        b.id,
        b.type,
        b.target_id,
        q.prompt AS title,
        mat.title AS meta
      FROM bookmarks b
      JOIN questions q ON q.id = b.target_id AND b.type = 'question'
      JOIN materials mat ON mat.id = q.material_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `)
    .all(req.user.id);
  return res.json({ data: rows });
});
