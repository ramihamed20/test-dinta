import { Router } from "express";
import { db } from "../../db/database.js";

export const studyPlanRouter = Router();

studyPlanRouter.get("/study-plan", (req, res) => {
  const rows = db.prepare("SELECT id, time, topic FROM study_plan_items WHERE user_id = ? ORDER BY time").all(req.user.id);
  return res.json({ data: rows });
});

studyPlanRouter.post("/study-plan", (req, res) => {
  const { time, topic } = req.body || {};
  if (!time || !topic) return res.status(400).json({ error: "Time and topic are required" });

  const result = db
    .prepare("INSERT INTO study_plan_items (user_id, time, topic) VALUES (?, ?, ?)")
    .run(req.user.id, time, topic);
  const row = db.prepare("SELECT * FROM study_plan_items WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json({ data: row });
});

studyPlanRouter.put("/study-plan/:id", (req, res) => {
  const { time, topic } = req.body || {};
  if (!time || !topic) return res.status(400).json({ error: "Time and topic are required" });

  db.prepare("UPDATE study_plan_items SET time = ?, topic = ? WHERE id = ? AND user_id = ?")
    .run(time, topic, req.params.id, req.user.id);
  const row = db.prepare("SELECT * FROM study_plan_items WHERE id = ?").get(req.params.id);
  return res.json({ data: row });
});

studyPlanRouter.delete("/study-plan/:id", (req, res) => {
  db.prepare("DELETE FROM study_plan_items WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  return res.json({ message: "Deleted" });
});
