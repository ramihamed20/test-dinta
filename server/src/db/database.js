import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../../data");
const dbPath = path.join(dataDir, "dentify.sqlite");

fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      year TEXT DEFAULT '3rd year',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      choices_json TEXT NOT NULL,
      correct_choice TEXT NOT NULL,
      explanation TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'Medium',
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS material_sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      sheet_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      total_pages INTEGER NOT NULL DEFAULT 12,
      summary TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      UNIQUE(material_id, sheet_number),
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_choice TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_plan_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      time TEXT NOT NULL,
      topic TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('question', 'material')),
      target_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, type, target_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('question', 'material')),
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      due_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      body TEXT NOT NULL,
      tone TEXT NOT NULL DEFAULT 'info',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS community_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      tag TEXT NOT NULL DEFAULT 'General',
      likes INTEGER NOT NULL DEFAULT 0,
      replies INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS community_likes (
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      PRIMARY KEY(user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leaderboard_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      metric TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      accuracy INTEGER NOT NULL DEFAULT 0,
      rank_order INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(scope, rank_order)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      metric TEXT NOT NULL,
      threshold INTEGER NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_id INTEGER NOT NULL,
      unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, achievement_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_theme_settings (
      user_id INTEGER PRIMARY KEY,
      character TEXT NOT NULL DEFAULT 'white' CHECK(character IN ('black', 'white')),
      theme TEXT NOT NULL DEFAULT 'night' CHECK(theme IN ('dawn', 'day', 'sunset', 'night')),
      auto_theme INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS advanced_sheet_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sheet_id INTEGER NOT NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
      unlocked_pages INTEGER NOT NULL DEFAULT 3,
      last_quizzed_page INTEGER NOT NULL DEFAULT 0,
      xp INTEGER NOT NULL DEFAULT 0,
      total_correct INTEGER NOT NULL DEFAULT 0,
      total_answered INTEGER NOT NULL DEFAULT 0,
      quiz_count INTEGER NOT NULL DEFAULT 0,
      average_score INTEGER NOT NULL DEFAULT 0,
      mastery_status TEXT NOT NULL DEFAULT 'Not mastered',
      needs_review_label TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, sheet_id, difficulty),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sheet_id) REFERENCES material_sheets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS advanced_quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sheet_id INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      page_start INTEGER NOT NULL,
      page_end INTEGER NOT NULL,
      is_final INTEGER NOT NULL DEFAULT 0,
      score INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      question_count INTEGER NOT NULL,
      xp_awarded INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL,
      weak_points_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sheet_id) REFERENCES material_sheets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS advanced_mistakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      sheet_id INTEGER NOT NULL,
      page_range TEXT NOT NULL,
      question TEXT NOT NULL,
      user_answer TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      topic TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      review_available_at TEXT NOT NULL,
      reviewed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
      FOREIGN KEY (sheet_id) REFERENCES material_sheets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS advanced_weak_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sheet_id INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      topic TEXT NOT NULL,
      wrong_count INTEGER NOT NULL DEFAULT 1,
      last_wrong_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, sheet_id, difficulty, topic),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sheet_id) REFERENCES material_sheets(id) ON DELETE CASCADE
    );
  `);
}

export function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    year: row.year,
    createdAt: row.created_at,
    themeSettings: getUserThemeSettings(row.id)
  };
}

export function getUserThemeSettings(userId) {
  db.prepare(`
    INSERT OR IGNORE INTO user_theme_settings (user_id, character)
    VALUES (?, 'white')
  `).run(userId);
  const row = db
    .prepare("SELECT character, theme, auto_theme AS autoTheme, updated_at AS updatedAt FROM user_theme_settings WHERE user_id = ?")
    .get(userId);
  return {
    character: row.character,
    theme: row.theme,
    autoTheme: Boolean(row.autoTheme),
    updatedAt: row.updatedAt
  };
}

export function saveUserThemeSettings(userId, settings) {
  db.prepare(`
    INSERT INTO user_theme_settings (user_id, character, theme, auto_theme, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      character = excluded.character,
      theme = excluded.theme,
      auto_theme = excluded.auto_theme,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, settings.character, settings.theme, settings.autoTheme ? 1 : 0);
  return getUserThemeSettings(userId);
}
