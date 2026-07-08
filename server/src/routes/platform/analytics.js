import { Router } from "express";
import { db } from "../../db/database.js";
import { getUserStats, getMaterialProgress } from "../../lib/stats.js";

export const analyticsRouter = Router();

analyticsRouter.get("/progress", (req, res) => {
  const stats = getUserStats(req.user.id);
  const materials = getMaterialProgress(req.user.id);
  const plan = db.prepare("SELECT id, time, topic FROM study_plan_items WHERE user_id = ? ORDER BY time").all(req.user.id);

  return res.json({
    data: {
      stats,
      materials,
      studyPlan: plan
    }
  });
});

analyticsRouter.get("/analytics", (req, res) => {
  const stats = getUserStats(req.user.id);
  const byDay = db
    .prepare(`
      SELECT date(created_at, 'localtime') AS date, COUNT(*) AS count
      FROM attempts
      WHERE user_id = ? AND date(created_at, 'localtime') >= date('now', 'localtime', '-27 days')
      GROUP BY date(created_at, 'localtime')
      ORDER BY date(created_at, 'localtime')
    `)
    .all(req.user.id);
  const difficulty = db
    .prepare(`
      SELECT
        q.difficulty,
        COUNT(DISTINCT q.id) AS total,
        COUNT(a.id) AS attempts,
        COALESCE(ROUND(AVG(CASE WHEN a.is_correct IS NULL THEN NULL ELSE a.is_correct END) * 100), 0) AS accuracy
      FROM questions q
      LEFT JOIN attempts a ON a.question_id = q.id AND a.user_id = ?
      GROUP BY q.difficulty
      ORDER BY
        CASE q.difficulty
          WHEN 'Easy' THEN 1
          WHEN 'Medium' THEN 2
          WHEN 'Hard' THEN 3
          ELSE 4
        END
    `)
    .all(req.user.id)
    .map((row) => ({
      difficulty: row.difficulty,
      total: row.total,
      attempts: row.attempts,
      accuracy: row.accuracy,
      coverage: row.total ? Math.min(100, Math.round((row.attempts / row.total) * 100)) : 0
    }));

  return res.json({ data: { stats, materials: getMaterialProgress(req.user.id), solvedByDay: byDay, difficulty } });
});
