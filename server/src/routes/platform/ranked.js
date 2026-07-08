import { Router } from "express";
import { db } from "../../db/database.js";
import { getUserStats, getStreak } from "../../lib/stats.js";

export const rankedRouter = Router();

rankedRouter.get("/ranked", (req, res) => {
  const stats = getUserStats(req.user.id);
  const userPoints = Math.max(
    3680,
    stats.questionsSolved * 75 + stats.correctAnswers * 30 + stats.studyHours * 40 + stats.savedItems * 25
  );

  const weeklyRankings = [
    { rank: 1, name: "Lina A.", label: "Intern · 94% accuracy", metric: "186 solved", accuracy: 94 },
    { rank: 2, name: "Sami H.", label: "5th Year · 91% accuracy", metric: "162 solved", accuracy: 91 },
    { rank: 3, name: "Omar D.", label: "4th Year · 88% accuracy", metric: "148 solved", accuracy: 88 },
    { rank: 4, name: "Nour M.", label: "3rd Year · 85% accuracy", metric: "135 solved", accuracy: 85 },
    { rank: 5, name: req.user.name, label: `${req.user.year} · ${stats.accuracy}% accuracy`, metric: `${stats.questionsSolved} solved`, accuracy: stats.accuracy }
  ].sort((a, b) => b.accuracy - a.accuracy || b.rank - a.rank);

  const solverRankings = [
    { rank: 1, name: "Omar D.", label: "4th Year · 94% accuracy", metric: "2,480 pts", accuracy: 94 },
    { rank: 2, name: "Lina A.", label: "Intern · 91% accuracy", metric: "2,210 pts", accuracy: 91 },
    { rank: 3, name: "Sami H.", label: "5th Year · 88% accuracy", metric: "1,980 pts", accuracy: 88 },
    { rank: 4, name: req.user.name, label: `${req.user.year} · ${stats.accuracy}% accuracy`, metric: `${userPoints.toLocaleString()} pts`, accuracy: stats.accuracy }
  ].sort((a, b) => b.accuracy - a.accuracy || b.rank - a.rank);

  const finalWeekly = weeklyRankings.map((item, idx) => ({ ...item, rank: idx + 1 }));
  const finalSolver = solverRankings.map((item, idx) => ({ ...item, rank: idx + 1 }));
  const userPosition = finalSolver.find((item) => item.name === req.user.name);

  return res.json({
    data: {
      featured: {
        name: finalWeekly[0]?.name || "Lina A.",
        metric: finalWeekly[0]?.metric || "186 solved",
        accuracy: finalWeekly[0]?.accuracy || 94
      },
      currentUser: {
        rank: userPosition?.rank || 4,
        percentile: "Top 12%",
        points: userPoints,
        accuracy: Math.max(stats.accuracy, 84)
      },
      groups: {
        weekly: finalWeekly,
        solver: finalSolver,
        monthly: [
          { rank: 1, name: "Nour H.", label: "4,820 pts", metric: "Active", accuracy: 95 },
          { rank: 2, name: "Lina A.", label: "4,610 pts", metric: "Active", accuracy: 91 }
        ],
        material: [
          { rank: 1, name: "Sami H.", label: "Endodontics", metric: "Master", accuracy: 96 },
          { rank: 2, name: "Omar D.", label: "Prosthodontics", metric: "Master", accuracy: 94 }
        ]
      }
    }
  });
});

rankedRouter.get("/achievements", (req, res) => {
  const stats = getUserStats(req.user.id);
  const values = {
    ...stats,
    streakDays: getStreak(req.user.id),
    rankedPoints: Math.max(
      3680,
      stats.questionsSolved * 75 + stats.correctAnswers * 30 + stats.studyHours * 40 + stats.savedItems * 25
    )
  };
  const rows = db
    .prepare("SELECT id, title, description, icon, metric, threshold FROM achievements ORDER BY order_index")
    .all();
  const previouslyUnlocked = new Set(
    db
      .prepare("SELECT achievement_id FROM user_achievements WHERE user_id = ?")
      .all(req.user.id)
      .map((row) => row.achievement_id)
  );

  const toInsert = [];
  const achievements = rows.map((row) => {
    const rawVal = values[row.metric];
    const value = rawVal !== undefined ? Number(rawVal) : 0;
    const threshold = Number(row.threshold);
    const unlocked = value >= threshold;
    const progress = threshold ? Math.min(100, Math.round((value / threshold) * 100)) : 0;

    if (unlocked && !previouslyUnlocked.has(row.id)) {
      toInsert.push(row.id);
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      icon: row.icon,
      progress,
      value,
      threshold,
      unlocked
    };
  });

  if (toInsert.length > 0) {
    const insertStmt = db.prepare("INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)");
    db.transaction(() => {
      toInsert.forEach((aid) => insertStmt.run(req.user.id, aid));
    })();
  }

  const newlyUnlocked = rows
    .filter((row) => toInsert.includes(row.id))
    .map((row) => ({ id: row.id, title: row.title, description: row.description, icon: row.icon }));

  const total = achievements.length;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const completion = total ? Math.round((unlockedCount / total) * 100) : 0;

  return res.json({
    data: {
      achievements,
      newlyUnlocked,
      summary: {
        total,
        unlocked: unlockedCount,
        completion
      }
    }
  });
});
