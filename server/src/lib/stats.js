import { db } from "../db/database.js";

export function getStreak(userId) {
  // Get distinct dates with attempts, ordered descending
  const rows = db.prepare(`
    SELECT DISTINCT date(created_at, 'localtime') AS day
    FROM attempts
    WHERE user_id = ?
    ORDER BY day DESC
  `).all(userId);

  if (!rows.length) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  // Streak must start from today or yesterday
  const firstDay = rows[0].day;
  if (firstDay !== todayStr && firstDay !== yesterdayStr) return 0;

  let streak = 1;
  for (let i = 1; i < rows.length; i++) {
    const prev = new Date(rows[i - 1].day);
    const curr = new Date(rows[i].day);
    const diffDays = Math.round((prev - curr) / 86400000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getUserStats(userId) {
  const totalQuestions = db.prepare("SELECT COUNT(*) AS count FROM questions").get().count;
  const attempts = db.prepare("SELECT COUNT(*) AS count FROM attempts WHERE user_id = ?").get(userId).count;
  const correct = db
    .prepare("SELECT COUNT(*) AS count FROM attempts WHERE user_id = ? AND is_correct = 1")
    .get(userId).count;
  const materialsCompleted = db
    .prepare(`
      SELECT COUNT(DISTINCT material_id) AS count
      FROM questions
      WHERE id IN (SELECT question_id FROM attempts WHERE user_id = ?)
    `)
    .get(userId).count;
  const savedItems = db.prepare("SELECT COUNT(*) AS count FROM bookmarks WHERE user_id = ?").get(userId).count;
  const reviewCount = db
    .prepare("SELECT COUNT(*) AS count FROM review_items WHERE user_id = ? AND completed_at IS NULL")
    .get(userId).count;
  const dueReviewCount = db
    .prepare("SELECT COUNT(*) AS count FROM review_items WHERE user_id = ? AND completed_at IS NULL AND datetime(due_at) <= datetime('now')")
    .get(userId).count;
  const studyPlanCount = db.prepare("SELECT COUNT(*) AS count FROM study_plan_items WHERE user_id = ?").get(userId).count;
  const todaySolved = db
    .prepare("SELECT COUNT(*) AS count FROM attempts WHERE user_id = ? AND date(created_at) = date('now', 'localtime')")
    .get(userId).count;
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  const dailyTarget = 15;
  const xp = attempts * 25 + correct * 15 + savedItems * 10 + studyPlanCount * 20 + reviewCount * 8;
  const level = Math.max(1, Math.floor(xp / 250) + 1);
  const currentLevelXp = (level - 1) * 250;
  const nextLevelXp = level * 250;
  const levelProgress = Math.min(100, Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100));

  return {
    totalQuestions,
    questionsSolved: attempts,
    correctAnswers: correct,
    accuracy,
    materialsCompleted,
    savedItems,
    reviewCount,
    dueReviewCount,
    studyPlanCount,
    studyHours: Math.max(4, studyPlanCount * 2),
    xp: {
      total: xp,
      level,
      title: level >= 12 ? "Clinical Scholar" : level >= 7 ? "Recall Builder" : level >= 4 ? "Pre-Clinical Climber" : "Dental Starter",
      progress: levelProgress,
      nextLevelXp,
      remaining: Math.max(0, nextLevelXp - xp)
    },
    dailyGoal: {
      target: dailyTarget,
      solvedToday: todaySolved,
      progress: Math.min(100, Math.round((todaySolved / dailyTarget) * 100)),
      remaining: Math.max(0, dailyTarget - todaySolved)
    }
  };
}

export function getMaterialProgress(userId) {
  return db
    .prepare(`
      SELECT
        m.id,
        m.title,
        m.slug,
        m.description,
        m.icon,
        COUNT(q.id) AS question_count,
        COUNT(a.id) AS attempts,
        COALESCE(ROUND(AVG(CASE WHEN a.is_correct IS NULL THEN NULL ELSE a.is_correct END) * 100), 0) AS accuracy
      FROM materials m
      LEFT JOIN questions q ON q.material_id = m.id
      LEFT JOIN attempts a ON a.question_id = q.id AND a.user_id = ?
      GROUP BY m.id
      ORDER BY m.order_index
    `)
    .all(userId)
    .map((row) => ({
      ...row,
      questionCount: row.question_count,
      progress: row.question_count ? Math.min(100, Math.round((row.attempts / row.question_count) * 100)) : 0
    }));
}

export function getWeeklyChallenge(userId) {
  const target = 50;
  const solved = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM attempts
      WHERE user_id = ? AND date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')
    `)
    .get(userId).count;
  return {
    title: "Weekly Solver Sprint",
    description: "Solve 50 questions in 7 days.",
    target,
    solved,
    progress: Math.min(100, Math.round((solved / target) * 100)),
    remaining: Math.max(0, target - solved),
    rewardXp: 250
  };
}
