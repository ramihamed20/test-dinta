import { Router } from "express";
import { db } from "../../db/database.js";

export const questionsRouter = Router();

questionsRouter.get("/questions", (req, res) => {
  const materialId = req.query.materialId || "";
  const difficulty = req.query.difficulty || "";

  let query = `
    SELECT
      q.id,
      q.prompt,
      q.explanation,
      q.difficulty,
      q.choices_json AS choicesJson,
      mat.title AS materialTitle,
      EXISTS(SELECT 1 FROM bookmarks WHERE user_id = ? AND type = 'question' AND target_id = q.id) AS bookmarked,
      EXISTS(SELECT 1 FROM attempts WHERE user_id = ? AND question_id = q.id) AS attempted
    FROM questions q
    JOIN materials mat ON mat.id = q.material_id
    WHERE 1=1
  `;
  const params = [req.user.id, req.user.id];

  if (materialId) {
    query += " AND q.material_id = ?";
    params.push(materialId);
  }
  if (difficulty) {
    query += " AND q.difficulty = ?";
    params.push(difficulty);
  }

  query += " ORDER BY q.id";

  const rows = db.prepare(query).all(...params);
  const data = rows.map((row) => ({
    id: row.id,
    prompt: row.prompt,
    explanation: row.explanation,
    difficulty: row.difficulty,
    materialTitle: row.materialTitle,
    bookmarked: !!row.bookmarked,
    attempted: !!row.attempted,
    choices: JSON.parse(row.choicesJson)
  }));

  return res.json({ data });
});

questionsRouter.post("/questions/:id/attempt", (req, res) => {
  const selectedChoice = String(req.body?.selectedChoice || "").trim();
  if (!selectedChoice) return res.status(400).json({ error: "selectedChoice is required" });

  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(req.params.id);
  if (!question) return res.status(404).json({ error: "Question not found" });

  const choices = JSON.parse(question.choices_json);
  const correctChoice = choices.find((c) => c.correct);
  const isCorrect = correctChoice && correctChoice.text === selectedChoice ? 1 : 0;

  db.prepare("INSERT INTO attempts (user_id, question_id, selected_choice, is_correct) VALUES (?, ?, ?, ?)")
    .run(req.user.id, question.id, selectedChoice, isCorrect);

  if (!isCorrect) {
    db.prepare(`
      INSERT INTO review_items (user_id, type, target_id, reason, due_at)
      VALUES (?, 'question', ?, 'Wrong answer in practice', datetime('now', '+24 hours'))
      ON CONFLICT(user_id, type, target_id) DO UPDATE SET
        due_at = datetime('now', '+24 hours'),
        completed_at = NULL,
        reason = 'Wrong answer in practice'
    `).run(req.user.id, question.id);
  } else {
    db.prepare("UPDATE review_items SET completed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND type = 'question' AND target_id = ?")
      .run(req.user.id, question.id);
  }

  return res.json({
    data: {
      correct: !!isCorrect,
      correctAnswer: correctChoice ? correctChoice.text : "",
      explanation: question.explanation
    }
  });
});
