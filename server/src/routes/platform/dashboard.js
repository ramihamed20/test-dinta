import { Router } from "express";
import { db } from "../../db/database.js";
import { getUserStats, getMaterialProgress, getStreak, getWeeklyChallenge } from "../../lib/stats.js";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard", (req, res) => {
  const stats = getUserStats(req.user.id);
  const materials = getMaterialProgress(req.user.id);
  const plan = db
    .prepare("SELECT id, time, topic FROM study_plan_items WHERE user_id = ? ORDER BY time")
    .all(req.user.id);
  const review = db
    .prepare("SELECT id, type, target_id, reason, due_at FROM review_items WHERE user_id = ? AND completed_at IS NULL ORDER BY due_at LIMIT 4")
    .all(req.user.id);
  const streak = getStreak(req.user.id);

  return res.json({
    data: {
      user: req.user,
      stats,
      streak,
      nextMaterial: materials.find((item) => item.progress < 100) || materials[0],
      materials: materials.slice(0, 4),
      studyPlan: plan,
      review,
      insight: buildDashboardInsight(stats, materials, review),
      weeklyChallenge: getWeeklyChallenge(req.user.id)
    }
  });
});

function buildDashboardInsight(stats, materials, reviewItems) {
  const nextMaterial = materials.find((item) => item.progress < 100) || materials[0];
  const strongestMaterial = [...materials].sort((a, b) => b.accuracy - a.accuracy || b.progress - a.progress)[0];
  const dailyRemaining = stats.dailyGoal?.remaining || 0;

  if (stats.dueReviewCount > 0) {
    return {
      title: "Review waiting",
      body: `${stats.dueReviewCount} review ${stats.dueReviewCount === 1 ? "item is" : "items are"} due. Clear them before starting new questions.`,
      icon: "target",
      actionLabel: "Start review",
      actionUrl: "/review"
    };
  }

  if (dailyRemaining > 0) {
    return {
      title: "Daily target active",
      body: `${dailyRemaining} more ${dailyRemaining === 1 ? "question" : "questions"} to reach your daily goal. Keep the streak active!`,
      icon: "activity",
      actionLabel: "Practice",
      actionUrl: nextMaterial ? `/questions?materialId=${nextMaterial.id}` : "/questions"
    };
  }

  if (reviewItems.length > 0) {
    return {
      title: "Keep items fresh",
      body: `You have completed today's target, but ${reviewItems.length} review ${reviewItems.length === 1 ? "item is" : "items are"} waiting.`,
      icon: "target",
      actionLabel: "Clear review",
      actionUrl: "/review"
    };
  }

  if (strongestMaterial && strongestMaterial.accuracy >= 85) {
    return {
      title: "Top performance",
      body: `You are showing high accuracy (${strongestMaterial.accuracy}%) in ${strongestMaterial.title}. Keep up the great pace!`,
      icon: "check",
      actionLabel: "Study library",
      actionUrl: "/materials"
    };
  }

  return {
    title: "Continuous path",
    body: "Establish a daily dental learning routine. Practice a small block every day.",
    icon: "file",
    actionLabel: "All materials",
    actionUrl: "/materials"
  };
}
