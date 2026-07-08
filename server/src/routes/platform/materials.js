import { Router } from "express";
import { db } from "../../db/database.js";
import {
  buildPlaceholderQuiz,
  buildSheetPages,
  getMasteryStatus,
  getPageBlock,
  normalizeDifficulty,
  resultMessage,
  scoreQuiz
} from "../../lib/advancedStudy.js";
import { getMaterialProgress } from "../../lib/stats.js";

export const materialsRouter = Router();

materialsRouter.get("/materials", (req, res) => {
  const materials = getMaterialProgress(req.user.id);
  return res.json({ data: materials });
});

materialsRouter.get("/materials/:materialId/sheets", (req, res) => {
  const material = db.prepare("SELECT * FROM materials WHERE id = ?").get(req.params.materialId);
  if (!material) return res.status(404).json({ error: "Material not found" });

  const rawSheets = db
    .prepare(`
      SELECT
        s.*,
        p.mastery_status,
        p.average_score AS best_average,
        p.completed_at
      FROM material_sheets s
      LEFT JOIN advanced_sheet_progress p
        ON p.sheet_id = s.id
        AND p.user_id = ?
        AND p.difficulty = 'Normal'
      WHERE s.material_id = ?
      ORDER BY s.sheet_number
    `)
    .all(req.user.id, material.id);

  const sheets = rawSheets.map((sheet) => ({
    id: sheet.id,
    sheetNumber: sheet.sheet_number,
    title: sheet.title,
    totalPages: sheet.total_pages,
    summary: sheet.summary,
    mastered: !!sheet.completed_at,
    bestAverage: sheet.best_average,
    masteryStatus: sheet.mastery_status || "Not started"
  }));

  return res.json({
    data: {
      material: {
        id: material.id,
        title: material.title,
        description: material.description,
        slug: material.slug,
        icon: material.icon
      },
      sheets
    }
  });
});

materialsRouter.post("/sheets/:id/start", (req, res) => {
  const difficulty = normalizeDifficulty(req.body?.difficulty);
  const sheet = getSheet(req.params.id);
  if (!sheet) return res.status(404).json({ error: "Sheet not found" });

  const progress = getOrCreateProgress(req.user.id, sheet.id, difficulty);
  return res.json({ data: buildAdvancedSession(req.user.id, sheet, progress) });
});

materialsRouter.get("/sheets/:id/quiz", (req, res) => {
  const difficulty = normalizeDifficulty(req.query.difficulty);
  const sheet = getSheet(req.params.id);
  if (!sheet) return res.status(404).json({ error: "Sheet not found" });

  const progress = db
    .prepare("SELECT * FROM advanced_sheet_progress WHERE user_id = ? AND sheet_id = ? AND difficulty = ?")
    .get(req.user.id, sheet.id, difficulty);

  if (!progress) {
    return res.status(400).json({ error: "Study session has not been initialized for this sheet." });
  }

  const isFinal = progress.last_quizzed_page >= sheet.total_pages;
  const block = getPageBlock(progress.unlocked_pages, sheet.total_pages);
  const quiz = buildPlaceholderQuiz(sheet, block, difficulty, isFinal);

  return res.json({
    data: {
      sheet: toSheetPayload(sheet),
      difficulty,
      block,
      isFinal,
      quiz
    }
  });
});

materialsRouter.post("/sheets/:id/quiz/submit", (req, res) => {
  const difficulty = normalizeDifficulty(req.body?.difficulty);
  const answers = req.body?.answers || {};
  const sheet = getSheet(req.params.id);
  if (!sheet) return res.status(404).json({ error: "Sheet not found" });

  const progress = db
    .prepare("SELECT * FROM advanced_sheet_progress WHERE user_id = ? AND sheet_id = ? AND difficulty = ?")
    .get(req.user.id, sheet.id, difficulty);

  if (!progress) return res.status(400).json({ error: "No active session." });

  const block = getPageBlock(progress.unlocked_pages, sheet.total_pages);
  const isFinal = progress.last_quizzed_page >= sheet.total_pages;
  const result = scoreQuiz(sheet, block, difficulty, isFinal, answers);

  saveAdvancedQuizResult(req.user.id, sheet, difficulty, block, isFinal, result);
  saveAdvancedMistakes(req.user.id, sheet, difficulty, block, result.wrongItems);
  updateAdvancedProgress(req.user.id, sheet, progress, difficulty, block, isFinal, result);

  const nextProgress = db
    .prepare("SELECT * FROM advanced_sheet_progress WHERE user_id = ? AND sheet_id = ? AND difficulty = ?")
    .get(req.user.id, sheet.id, difficulty);

  return res.json({
    data: {
      result: {
        score: result.score,
        correctCount: result.correctCount,
        questionCount: result.questionCount,
        xpAwarded: result.xpAwarded,
        message: resultMessage(result.score, isFinal),
        weakPoints: result.weakPoints,
        wrongItems: result.wrongItems
      },
      nextSession: buildAdvancedSession(req.user.id, sheet, nextProgress)
    }
  });
});

materialsRouter.post("/sheets/:id/advanced/continue", (req, res) => {
  const difficulty = normalizeDifficulty(req.body?.difficulty);
  const sheet = getSheet(req.params.id);
  if (!sheet) return res.status(404).json({ error: "Sheet not found" });

  const progress = db
    .prepare("SELECT * FROM advanced_sheet_progress WHERE user_id = ? AND sheet_id = ? AND difficulty = ?")
    .get(req.user.id, sheet.id, difficulty);

  if (!progress) return res.status(400).json({ error: "No session initialized." });

  return res.json({ data: buildAdvancedSession(req.user.id, sheet, progress) });
});

materialsRouter.get("/advanced/mistakes", (req, res) => {
  const rows = db
    .prepare(`
      SELECT
        m.id,
        m.question,
        m.user_answer AS userAnswer,
        m.correct_answer AS correctAnswer,
        m.explanation,
        m.topic,
        m.difficulty,
        mat.title AS materialTitle,
        s.title AS sheetTitle
      FROM advanced_mistakes m
      JOIN materials mat ON mat.id = m.material_id
      JOIN material_sheets s ON s.id = m.sheet_id
      WHERE m.user_id = ?
        AND m.reviewed_at IS NULL
        AND datetime(m.review_available_at) <= datetime('now')
      ORDER BY m.created_at
    `)
    .all(req.user.id);
  return res.json({ data: rows });
});

// --- Helpers ---

function getSheet(sheetId) {
  return db
    .prepare(`
      SELECT s.*, m.id AS material_id, m.title AS material_title, m.slug AS material_slug, m.icon AS material_icon
      FROM material_sheets s
      JOIN materials m ON m.id = s.material_id
      WHERE s.id = ?
    `)
    .get(sheetId);
}

function toSheetPayload(sheet) {
  return {
    id: sheet.id,
    materialId: sheet.material_id,
    materialTitle: sheet.material_title,
    materialSlug: sheet.material_slug,
    materialIcon: sheet.material_icon,
    sheetNumber: sheet.sheet_number,
    title: sheet.title,
    totalPages: sheet.total_pages,
    summary: sheet.summary
  };
}

function getOrCreateProgress(userId, sheetId, difficulty) {
  db.prepare(`
    INSERT OR IGNORE INTO advanced_sheet_progress (user_id, sheet_id, difficulty)
    VALUES (?, ?, ?)
  `).run(userId, sheetId, difficulty);
  return db
    .prepare("SELECT * FROM advanced_sheet_progress WHERE user_id = ? AND sheet_id = ? AND difficulty = ?")
    .get(userId, sheetId, difficulty);
}

function progressPayload(progress, sheet) {
  return {
    difficulty: progress.difficulty,
    unlockedPages: progress.unlocked_pages,
    lastQuizzedPage: progress.last_quizzed_page,
    xp: progress.xp,
    totalCorrect: progress.total_correct,
    totalAnswered: progress.total_answered,
    quizCount: progress.quiz_count,
    averageScore: progress.average_score,
    masteryStatus: progress.mastery_status,
    needsReviewLabel: progress.needs_review_label,
    completedAt: progress.completed_at,
    totalPages: sheet.total_pages
  };
}

function buildAdvancedSession(userId, sheet, progress) {
  const block = getPageBlock(progress.unlocked_pages, sheet.total_pages);
  const weakPoints = db
    .prepare(`
      SELECT topic, wrong_count AS wrongCount
      FROM advanced_weak_points
      WHERE user_id = ? AND sheet_id = ? AND difficulty = ?
      ORDER BY wrong_count DESC, datetime(last_wrong_at) DESC
      LIMIT 5
    `)
    .all(userId, sheet.id, progress.difficulty);
  return {
    mode: "advanced",
    sheet: toSheetPayload(sheet),
    difficulty: progress.difficulty,
    block,
    pages: buildSheetPages(sheet, block.pageStart, block.pageEnd),
    progress: progressPayload(progress, sheet),
    quizRequired: progress.last_quizzed_page < progress.unlocked_pages,
    finalAvailable: progress.last_quizzed_page >= sheet.total_pages && !progress.completed_at,
    weakPoints
  };
}

function saveAdvancedQuizResult(userId, sheet, difficulty, block, isFinal, result) {
  db.prepare(`
    INSERT INTO advanced_quiz_results (
      user_id, sheet_id, difficulty, page_start, page_end, is_final, score, correct_count,
      question_count, xp_awarded, message, weak_points_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    sheet.id,
    difficulty,
    block.pageStart,
    block.pageEnd,
    isFinal ? 1 : 0,
    result.score,
    result.correctCount,
    result.questionCount,
    result.xpAwarded,
    resultMessage(result.score, isFinal),
    JSON.stringify(result.weakPoints)
  );
}

function saveAdvancedMistakes(userId, sheet, difficulty, block, wrongItems) {
  if (!wrongItems.length) return;
  const insertMistake = db.prepare(`
    INSERT INTO advanced_mistakes (
      user_id, material_id, sheet_id, page_range, question, user_answer, correct_answer,
      explanation, difficulty, topic, review_available_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'))
  `);
  const upsertWeakPoint = db.prepare(`
    INSERT INTO advanced_weak_points (user_id, sheet_id, difficulty, topic)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, sheet_id, difficulty, topic) DO UPDATE SET
      wrong_count = wrong_count + 1,
      last_wrong_at = CURRENT_TIMESTAMP
  `);

  db.exec("BEGIN");
  try {
    wrongItems.forEach((item) => {
      insertMistake.run(
        userId,
        sheet.material_id,
        sheet.id,
        `${block.pageStart}-${block.pageEnd}`,
        item.question,
        item.userAnswer,
        item.correctAnswer,
        item.explanation,
        difficulty,
        item.topic
      );
      upsertWeakPoint.run(userId, sheet.id, difficulty, item.topic);
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function updateAdvancedProgress(userId, sheet, progress, difficulty, block, isFinal, result) {
  const nextQuizCount = progress.quiz_count + 1;
  const nextAverage = Math.round(((progress.average_score * progress.quiz_count) + result.score) / nextQuizCount);
  const nextTotalCorrect = progress.total_correct + result.correctCount;
  const nextTotalAnswered = progress.total_answered + result.questionCount;
  const nextXp = progress.xp + result.xpAwarded;
  let unlockedPages = progress.unlocked_pages;
  let lastQuizzedPage = progress.last_quizzed_page;
  let masteryStatus = getMasteryStatus(nextAverage);
  let completedAt = progress.completed_at;
  let needsReviewLabel = null;

  if (isFinal) {
    if (result.score >= 80) {
      masteryStatus = "Mastered";
      completedAt = new Date().toISOString();
    } else {
      masteryStatus = nextAverage >= 60 ? "In progress" : "Not mastered";
      needsReviewLabel = "Needs review";
    }
  } else if (result.score >= 70) {
    unlockedPages = Math.min(sheet.total_pages, Math.max(progress.unlocked_pages, block.pageEnd + 3));
    lastQuizzedPage = Math.max(progress.last_quizzed_page, block.pageEnd);
    needsReviewLabel = result.score < 90 ? "Needs light review" : null;
  } else if (result.score >= 50) {
    needsReviewLabel = "Needs review";
  } else {
    needsReviewLabel = "Needs review";
  }

  db.prepare(`
    UPDATE advanced_sheet_progress
    SET unlocked_pages = ?,
        last_quizzed_page = ?,
        xp = ?,
        total_correct = ?,
        total_answered = ?,
        quiz_count = ?,
        average_score = ?,
        mastery_status = ?,
        needs_review_label = ?,
        completed_at = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND sheet_id = ? AND difficulty = ?
  `).run(
    unlockedPages,
    lastQuizzedPage,
    nextXp,
    nextTotalCorrect,
    nextTotalAnswered,
    nextQuizCount,
    nextAverage,
    masteryStatus,
    needsReviewLabel,
    completedAt,
    userId,
    sheet.id,
    difficulty
  );
}
