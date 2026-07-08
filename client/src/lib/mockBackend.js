import { focusDurations, onboardingDefaults } from "./constants.js";

// --- Seed Data in Browser Memory ---
const initialMaterials = [
  { id: 1, title: "Oral Anatomy", slug: "oral-anatomy", description: "Tooth morphology, arches, nerve branches, and key landmarks.", icon: "book-open", questionCount: 10 },
  { id: 2, title: "Oral Histology", slug: "oral-histology", description: "Enamel, dentin, pulp, periodontium, and tissues.", icon: "activity", questionCount: 10 },
  { id: 3, title: "Prosthodontics", slug: "prosthodontics", description: "Impressions, occlusion, dentures, and crowns.", icon: "layers", questionCount: 10 },
  { id: 4, title: "Periodontology", slug: "periodontology", description: "Gingiva, pocket charting, and periodontal therapy.", icon: "activity", questionCount: 10 },
  { id: 5, title: "Endodontics", slug: "endodontics", description: "Pulp disease, access cavities, and obturation.", icon: "target", questionCount: 10 },
  { id: 6, title: "Local Anesthesia", slug: "local-anesthesia", description: "Injection techniques, doses, and complications.", icon: "syringe", questionCount: 10 },
  { id: 7, title: "Dental Materials", slug: "dental-materials", description: "Cements, composites, impression materials, and amalgam.", icon: "layers", questionCount: 10 }
];

const initialQuestions = [
  { id: 1, materialId: 1, prompt: "Which tissue forms the main bulk of the tooth?", choices: ["Enamel", "Dentin", "Cementum", "Pulp"], correct: "Dentin", explanation: "Dentin surrounds the pulp cavity and forms the bulk of the tooth.", difficulty: "Easy" },
  { id: 2, materialId: 1, prompt: "The mandibular nerve exits the skull through which foramen?", choices: ["Foramen ovale", "Foramen rotundum", "Stylomastoid foramen", "Mental foramen"], correct: "Foramen ovale", explanation: "The mandibular division (V3) exits through the foramen ovale.", difficulty: "Medium" },
  { id: 3, materialId: 2, prompt: "Which cells are responsible for enamel formation?", choices: ["Odontoblasts", "Ameloblasts", "Cementoblasts", "Fibroblasts"], correct: "Ameloblasts", explanation: "Ameloblasts form the enamel enamel matrix.", difficulty: "Easy" },
  { id: 4, materialId: 3, prompt: "Which material is commonly used for preliminary impressions?", choices: ["Alginate", "Zinc phosphate", "Composite resin", "Amalgam"], correct: "Alginate", explanation: "Alginate is an irreversible hydrocolloid used for preliminary impressions.", difficulty: "Easy" },
  { id: 5, materialId: 4, prompt: "What is the normal probing depth range for healthy gingiva?", choices: ["0-1 mm", "1-3 mm", "4-6 mm", "7-9 mm"], correct: "1-3 mm", explanation: "Healthy pockets measure between 1 and 3 mm.", difficulty: "Medium" },
  { id: 6, materialId: 5, prompt: "Which irrigant is widely used for dissolving organic tissue in root canals?", choices: ["Saline", "Sodium hypochlorite", "Distilled water", "Ethanol"], correct: "Sodium hypochlorite", explanation: "Sodium hypochlorite dissolves pulp tissue and has antimicrobial properties.", difficulty: "Medium" },
  { id: 7, materialId: 6, prompt: "Which nerve block is used to anesthetize mandibular molars?", choices: ["Infraorbital block", "Inferior alveolar nerve block", "Greater palatine block", "Nasopalatine block"], correct: "Inferior alveolar nerve block", explanation: "The inferior alveolar block numbs all mandibular teeth on that side.", difficulty: "Easy" },
  { id: 8, materialId: 7, prompt: "Which phase gives dental amalgam its major strength?", choices: ["Gamma", "Gamma-1", "Gamma-2", "Eta"], correct: "Gamma-1", explanation: "Gamma-1 is the strong silver-mercury phase of set amalgam.", difficulty: "Hard" }
];

const initialLeaderboard = [
  { type: "weekly", name: "Lina A.", title: "Weekly Champion", meta: "186 solved", points: 4820, accuracy: 94, rank: 1 },
  { type: "weekly", name: "Omar M.", title: "Second Place", meta: "171 solved", points: 4510, accuracy: 91, rank: 2 },
  { type: "weekly", name: "Sara K.", title: "Third Place", meta: "164 solved", points: 4240, accuracy: 89, rank: 3 },
  { type: "monthly", name: "Nour H.", title: "Monthly Champion", meta: "620 solved", points: 12840, accuracy: 92, rank: 1 },
  { type: "monthly", name: "Ali R.", title: "Second Place", meta: "584 solved", points: 11920, accuracy: 90, rank: 2 },
  { type: "batch", name: "Rami H.", title: "Your Batch Rank", meta: "Top 12%", points: 3680, accuracy: 84, rank: 12 }
];

const initialCommunity = [
  { id: 1, authorEmail: "demo@dentify.local", authorName: "Lina A.", tag: "Question", body: "Does anyone have a clean perio charting summary? I want something I can review before clinic.", likes: 18, replies: 5, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, authorEmail: "demo@dentify.local", authorName: "Omar M.", tag: "Resource", body: "I made a local anesthesia dose table with max doses and common blocks.", likes: 24, replies: 7, created_at: new Date(Date.now() - 7200000).toISOString() }
];

// --- LocalStorage DB Wrappers ---
function getDB(key, defaults) {
  const stored = localStorage.getItem(`dentify.mock.${key}`);
  if (!stored) {
    localStorage.setItem(`dentify.mock.${key}`, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(stored);
}

function setDB(key, data) {
  localStorage.setItem(`dentify.mock.${key}`, JSON.stringify(data));
}

// --- Initialize Database State ---
export function initMockDB() {
  getDB("materials", initialMaterials);
  getDB("questions", initialQuestions);
  getDB("attempts", {});
  getDB("bookmarks", []);
  getDB("leaderboard", initialLeaderboard);
  getDB("community", initialCommunity);
  getDB("studyPlan", [
    { id: "p1", time: "09:00", topic: "Oral Anatomy" },
    { id: "p2", time: "14:30", topic: "Histology Revision" }
  ]);
  getDB("xp", { level: 1, total: 320, progress: 32, title: "Dental Starter" });
  getDB("streak", 4);
}

// Helper to determine material stats
function getMaterialProgress(materialId) {
  const questions = getDB("questions", initialQuestions).filter(q => q.materialId === Number(materialId));
  const attempts = getDB("attempts", {});
  if (!questions.length) return 0;
  let solvedCount = 0;
  questions.forEach(q => {
    if (attempts[q.id] !== undefined) solvedCount++;
  });
  return Math.round((solvedCount / questions.length) * 100);
}

// --- Mock Route Interceptor ---
export async function handleMockRequest(path, options = {}) {
  initMockDB();

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));

  const cleanPath = path.split("?")[0];
  const params = new URLSearchParams(path.split("?")[1] || "");

  // POST /api/auth/login or register
  if (cleanPath === "/api/auth/login" || cleanPath === "/api/auth/register") {
    const payload = JSON.parse(options.body || "{}");
    const email = payload.email || "demo@dentify.local";
    const name = email.split("@")[0];
    localStorage.setItem("dentify.token", "mock-session-token");
    localStorage.setItem("dentify.user", JSON.stringify({ email, name, role: "student" }));
    return {
      ok: true,
      data: {
        token: "mock-session-token",
        user: { email, name, role: "student" }
      }
    };
  }

  // GET /api/me
  if (cleanPath === "/api/me") {
    const user = JSON.parse(localStorage.getItem("dentify.user") || '{"email":"demo@dentify.local","name":"Demo User","role":"student"}');
    return { ok: true, data: user };
  }

  // PUT /api/profile
  if (cleanPath === "/api/profile" && options.method === "PUT") {
    const payload = JSON.parse(options.body || "{}");
    const user = JSON.parse(localStorage.getItem("dentify.user") || "{}");
    const updated = { ...user, name: payload.name || user.name, year: payload.year || user.year };
    localStorage.setItem("dentify.user", JSON.stringify(updated));
    return { ok: true, data: updated };
  }

  // PUT /api/profile/password
  if (cleanPath === "/api/profile/password" && options.method === "PUT") {
    return { ok: true, data: { message: "Password updated" } };
  }

  // GET /api/materials
  if (cleanPath === "/api/materials") {
    const materials = getDB("materials", initialMaterials);
    const enriched = materials.map(m => ({
      ...m,
      progress: getMaterialProgress(m.id)
    }));
    return { ok: true, data: enriched };
  }

  // GET /api/materials/:id/sheets
  const sheetMatch = cleanPath.match(/\/api\/materials\/(\d+)\/sheets/);
  if (sheetMatch) {
    const matId = Number(sheetMatch[1]);
    const materials = getDB("materials", initialMaterials);
    const material = materials.find(m => m.id === matId) || materials[0];
    const blueprints = ["Tooth Morphology", "Dental Arches", "Maxillary Landmarks", "Mandibular Landmarks"];
    const sheets = blueprints.map((title, i) => ({
      id: i + 1,
      title,
      summary: `Detailed reference sheet about ${title.toLowerCase()}`,
      totalPages: 8,
      bestAverage: i === 0 ? 85 : 0,
      masteryStatus: i === 0 ? "Strong" : "New",
      mastered: i === 0
    }));
    return { ok: true, data: { material, sheets } };
  }

  // GET /api/questions
  if (cleanPath === "/api/questions") {
    const materialId = params.get("materialId");
    const difficulty = params.get("difficulty");
    const allQuestions = getDB("questions", initialQuestions);
    const attempts = getDB("attempts", {});
    const bookmarks = getDB("bookmarks", []);

    let filtered = allQuestions;
    if (materialId) {
      filtered = filtered.filter(q => q.materialId === Number(materialId));
    }
    if (difficulty) {
      filtered = filtered.filter(q => q.difficulty === difficulty);
    }

    const mapped = filtered.map(q => ({
      ...q,
      attempts: attempts[q.id] ? 1 : 0,
      correct: attempts[q.id]?.correct || false,
      bookmarked: bookmarks.some(b => b.targetId === q.id)
    }));
    return { ok: true, data: mapped };
  }

  // POST /api/questions/:id/attempt
  const attemptMatch = cleanPath.match(/\/api\/questions\/(\d+)\/attempt/);
  if (attemptMatch) {
    const qId = Number(attemptMatch[1]);
    const payload = JSON.parse(options.body || "{}");
    const allQuestions = getDB("questions", initialQuestions);
    const question = allQuestions.find(q => q.id === qId);

    if (!question) {
      return { ok: false, error: "Question not found" };
    }

    const correct = question.correct === payload.selectedChoice;
    const attempts = getDB("attempts", {});
    attempts[qId] = { correct, selected: payload.selectedChoice };
    setDB("attempts", attempts);

    // Update XP
    const xp = getDB("xp", { level: 1, total: 320, progress: 32, title: "Dental Starter" });
    xp.total += correct ? 20 : 5;
    xp.level = Math.floor(xp.total / 1000) + 1;
    xp.progress = Math.round((xp.total % 1000) / 10);
    xp.remaining = 1000 - (xp.total % 1000);
    setDB("xp", xp);

    return {
      ok: true,
      data: {
        correct,
        correctAnswer: question.correct,
        explanation: question.explanation
      }
    };
  }

  // POST /api/bookmarks
  if (cleanPath === "/api/bookmarks" && options.method === "POST") {
    const payload = JSON.parse(options.body || "{}");
    const bookmarks = getDB("bookmarks", []);
    const idx = bookmarks.findIndex(b => b.targetId === payload.targetId);
    if (idx > -1) {
      bookmarks.splice(idx, 1);
    } else {
      bookmarks.push({ id: Date.now(), type: payload.type, targetId: payload.targetId });
    }
    setDB("bookmarks", bookmarks);
    return { ok: true, data: bookmarks };
  }

  // GET /api/bookmarks
  if (cleanPath === "/api/bookmarks") {
    const bookmarks = getDB("bookmarks", []);
    const questions = getDB("questions", initialQuestions);
    const enriched = bookmarks.map(b => {
      const q = questions.find(item => item.id === b.targetId);
      return {
        id: b.id,
        type: b.type,
        title: q ? q.prompt : "Bookmarked Item",
        meta: q ? `Bookmark #${q.id}` : "Saved material"
      };
    });
    return { ok: true, data: enriched };
  }

  // GET /api/dashboard
  if (cleanPath === "/api/dashboard") {
    const attempts = getDB("attempts", {});
    const bookmarks = getDB("bookmarks", []);
    const studyPlan = getDB("studyPlan", []);
    const xp = getDB("xp", { level: 1, total: 320, progress: 32, title: "Dental Starter" });
    const materials = getDB("materials", initialMaterials);

    const questionsSolved = Object.keys(attempts).length;
    const correctCount = Object.values(attempts).filter(a => a.correct).length;
    const accuracy = questionsSolved ? Math.round((correctCount / questionsSolved) * 100) : 100;

    const stats = {
      materialsCompleted: materials.filter(m => getMaterialProgress(m.id) === 100).length,
      questionsSolved,
      accuracy,
      dueReviewCount: 3,
      savedItems: bookmarks.length,
      reviewCount: 3,
      dailyGoal: { target: 15, solvedToday: Math.min(15, questionsSolved), progress: Math.round((Math.min(15, questionsSolved) / 15) * 100), remaining: Math.max(0, 15 - questionsSolved) },
      xp
    };

    return {
      ok: true,
      data: {
        stats,
        nextMaterial: materials[0],
        materials,
        review: [
          { id: 1, reason: "Dissolving organic tissue block", due_at: new Date().toISOString() },
          { id: 2, reason: "Local anesthesia safety blocks", due_at: new Date().toISOString() }
        ],
        weeklyChallenge: { title: "Solver Sprint", progress: Math.min(100, Math.round((questionsSolved / 50) * 100)), solved: questionsSolved, target: 50, rewardXp: 250, remaining: Math.max(0, 50 - questionsSolved) },
        studyPlan,
        insight: { title: "Study recommendation", body: "Spend 25 minutes reviewing oral histology sheets for better exam retention.", actionLabel: "Review histology", actionPath: "/materials/2" }
      }
    };
  }

  // GET /api/community or POST /api/community/posts
  if (cleanPath === "/api/community") {
    const community = getDB("community", initialCommunity);
    return { ok: true, data: community };
  }

  // POST /api/community or /api/community/posts
  if ((cleanPath === "/api/community" || cleanPath === "/api/community/posts") && options.method === "POST") {
    const payload = JSON.parse(options.body || "{}");
    const community = getDB("community", initialCommunity);
    const user = JSON.parse(localStorage.getItem("dentify.user") || '{"email":"demo@dentify.local","name":"Demo User"}');
    const newPost = {
      id: Date.now(),
      authorEmail: user.email,
      authorName: user.name,
      tag: payload.tag || "Study tip",
      body: payload.body,
      likes: 0,
      replies: 0,
      created_at: new Date().toISOString()
    };
    community.unshift(newPost);
    setDB("community", community);
    return { ok: true, data: newPost };
  }

  // GET /api/ranked
  if (cleanPath === "/api/ranked") {
    const leaderboard = getDB("leaderboard", initialLeaderboard);
    return { ok: true, data: leaderboard };
  }

  // GET /api/achievements
  if (cleanPath === "/api/achievements") {
    const attempts = getDB("attempts", {});
    const solvedCount = Object.keys(attempts).length;
    const studyPlan = getDB("studyPlan", []);
    const xp = getDB("xp", { level: 1, total: 320, progress: 32, title: "Dental Starter" });

    const userAchievements = [
      { id: 1, title: "Study Starter", description: "Answer your first question", icon: "book-open", threshold: 1, metric: "solved", value: solvedCount, unlocked: solvedCount >= 1, progress: solvedCount >= 1 ? 100 : 0 },
      { id: 2, title: "Knowledge Seeker", description: "Solve 5 questions", icon: "award", threshold: 5, metric: "solved", value: solvedCount, unlocked: solvedCount >= 5, progress: Math.min(100, Math.round((solvedCount / 5) * 100)) },
      { id: 3, title: "Consistent Learner", description: "Maintain a 3-day streak", icon: "activity", threshold: 3, metric: "streak", value: 4, unlocked: true, progress: 100 },
      { id: 4, title: "Master Planner", description: "Create 3 study sessions", icon: "calendar", threshold: 3, metric: "study-plan", value: studyPlan.length, unlocked: studyPlan.length >= 3, progress: Math.min(100, Math.round((studyPlan.length / 3) * 100)) }
    ];

    const unlocked = userAchievements.filter(a => a.unlocked).length;
    const total = userAchievements.length;
    const completion = Math.round((unlocked / total) * 100);

    return {
      ok: true,
      data: {
        summary: { unlocked, total, completion },
        achievements: userAchievements,
        newlyUnlocked: []
      }
    };
  }

  // GET /api/analytics
  if (cleanPath === "/api/analytics") {
    const attempts = getDB("attempts", {});
    const questionsSolved = Object.keys(attempts).length;
    const correctCount = Object.values(attempts).filter(a => a.correct).length;
    const accuracy = questionsSolved ? Math.round((correctCount / questionsSolved) * 100) : 85;

    return {
      ok: true,
      data: {
        readiness: Math.min(100, Math.round((questionsSolved / 8) * 100)),
        accuracy,
        totalAttempts: questionsSolved,
        solvedByDay: [
          { date: "Mon", count: questionsSolved },
          { date: "Tue", count: 0 },
          { date: "Wed", count: 0 },
          { date: "Thu", count: 0 },
          { date: "Fri", count: 0 }
        ]
      }
    };
  }

  // GET /api/progress
  if (cleanPath === "/api/progress") {
    const attempts = getDB("attempts", {});
    const questionsSolved = Object.keys(attempts).length;
    const correctCount = Object.values(attempts).filter(a => a.correct).length;
    const accuracy = questionsSolved ? Math.round((correctCount / questionsSolved) * 100) : 100;
    const materials = getDB("materials", initialMaterials);

    const enrichedMaterials = materials.map(m => ({
      ...m,
      progress: getMaterialProgress(m.id),
      attempts: m.id === 1 ? questionsSolved : 0,
      accuracy: m.id === 1 ? accuracy : 0
    }));

    return {
      ok: true,
      data: {
        stats: {
          materialsCompleted: enrichedMaterials.filter(m => m.progress === 100).length,
          questionsSolved,
          accuracy,
          savedItems: getDB("bookmarks", []).length,
          dueReviewCount: 3
        },
        materials: enrichedMaterials,
        solvedByDay: [
          { day: "Mon", count: questionsSolved }
        ]
      }
    };
  }

  // POST /api/study-plan
  if (cleanPath === "/api/study-plan" && options.method === "POST") {
    const payload = JSON.parse(options.body || "{}");
    const studyPlan = getDB("studyPlan", []);
    const newBlock = { id: `p-${Date.now()}`, time: payload.time, topic: payload.topic };
    studyPlan.push(newBlock);
    studyPlan.sort((a, b) => a.time.localeCompare(b.time));
    setDB("studyPlan", studyPlan);
    return { ok: true, data: newBlock };
  }

  // PUT /api/study-plan/:id
  const editStudyPlanMatch = cleanPath.match(/\/api\/study-plan\/([\w-]+)/);
  if (editStudyPlanMatch && options.method === "PUT") {
    const pId = editStudyPlanMatch[1];
    const payload = JSON.parse(options.body || "{}");
    const studyPlan = getDB("studyPlan", []);
    const item = studyPlan.find(p => p.id === pId);
    if (item) {
      item.time = payload.time || item.time;
      item.topic = payload.topic || item.topic;
      studyPlan.sort((a, b) => a.time.localeCompare(b.time));
      setDB("studyPlan", studyPlan);
      return { ok: true, data: item };
    }
    return { ok: false, error: "Study plan item not found" };
  }

  // DELETE /api/study-plan/:id
  const deleteStudyPlanMatch = cleanPath.match(/\/api\/study-plan\/([\w-]+)/);
  if (deleteStudyPlanMatch && options.method === "DELETE") {
    const pId = deleteStudyPlanMatch[1];
    const studyPlan = getDB("studyPlan", []);
    const filtered = studyPlan.filter(p => p.id !== pId);
    setDB("studyPlan", filtered);
    return { ok: true, data: { success: true } };
  }

  // DELETE /api/bookmarks/:id
  const deleteBookmarkMatch = cleanPath.match(/\/api\/bookmarks\/(\d+)/);
  if (deleteBookmarkMatch && options.method === "DELETE") {
    const bId = Number(deleteBookmarkMatch[1]);
    const bookmarks = getDB("bookmarks", []);
    const filtered = bookmarks.filter(b => b.id !== bId);
    setDB("bookmarks", filtered);
    return { ok: true, data: { success: true } };
  }

  // POST /api/sheets/:sheetId/start
  const startSheetMatch = cleanPath.match(/\/api\/sheets\/(\d+)\/start/);
  if (startSheetMatch && options.method === "POST") {
    const sheetId = Number(startSheetMatch[1]);
    const payload = JSON.parse(options.body || "{}");
    const session = {
      id: `session-${Date.now()}`,
      sheetId,
      mode: payload.mode,
      difficulty: payload.difficulty || "Medium",
      sheet: {
        id: sheetId,
        title: "Oral Anatomy Reference Sheet",
        totalPages: 12
      },
      block: {
        pageStart: 1,
        pageEnd: payload.mode === "normal" ? 12 : 3
      },
      progress: {
        unlockedPages: payload.mode === "normal" ? 12 : 3,
        totalPages: 12
      },
      weakPoints: [],
      finalAvailable: false
    };
    localStorage.setItem(`dentify.mock.session.${sheetId}`, JSON.stringify(session));
    return { ok: true, data: session };
  }

  // GET /api/sheets/:sheetId/quiz
  const getQuizMatch = cleanPath.match(/\/api\/sheets\/(\d+)\/quiz/);
  if (getQuizMatch) {
    const sheetId = Number(getQuizMatch[1]);
    const isFinal = params.get("final") === "1";
    const difficulty = params.get("difficulty") || "Medium";

    const mockQuizQuestions = [
      { id: 101, prompt: "What is the primary organic component of enamel?", choices: ["Amelogenin", "Collagen", "Water", "Hydroxyapatite"], correct: "Amelogenin", explanation: "Amelogenin makes up about 90% of the organic matrix of developing enamel.", difficulty },
      { id: 102, prompt: "Which type of dentin is formed after root completion?", choices: ["Primary dentin", "Secondary dentin", "Tertiary dentin", "Sclerotic dentin"], correct: "Secondary dentin", explanation: "Secondary dentin is formed after root formation is complete and continues throughout life.", difficulty },
      { id: 103, prompt: "What is the thickness of the enamel at the incisal edge of a newly erupted incisor?", choices: ["0.5 mm", "1.0 mm", "2.0 mm", "3.0 mm"], correct: "2.0 mm", explanation: "Enamel is thickest at the incisal edge (about 2.0 mm) and thinnest at the CEJ.", difficulty }
    ];

    return {
      ok: true,
      data: {
        pageStart: 1,
        pageEnd: 3,
        isFinal,
        variant: 0,
        questions: mockQuizQuestions
      }
    };
  }

  // POST /api/sheets/:sheetId/quiz/submit
  const submitQuizMatch = cleanPath.match(/\/api\/sheets\/(\d+)\/quiz\/submit/);
  if (submitQuizMatch && options.method === "POST") {
    const sheetId = Number(submitQuizMatch[1]);
    const payload = JSON.parse(options.body || "{}");
    const answers = payload.answers || [];

    const correctAnswers = {
      101: "Amelogenin",
      102: "Secondary dentin",
      103: "2.0 mm"
    };

    let correctCount = 0;
    const wrongQuestions = [];
    answers.forEach(ans => {
      if (correctAnswers[ans.questionId] === ans.selectedAnswer) {
        correctCount++;
      } else {
        wrongQuestions.push({
          id: ans.questionId,
          topic: ans.questionId === 101 ? "Enamel Matrix" : ans.questionId === 102 ? "Dentin Types" : "Enamel Thickness",
          wrongCount: 1
        });
      }
    });

    const accuracy = Math.round((correctCount / answers.length) * 100);
    const result = {
      sheetId,
      pageStart: payload.pageStart,
      pageEnd: payload.pageEnd,
      correctCount,
      totalCount: answers.length,
      accuracy,
      weakPoints: wrongQuestions,
      finalAvailable: payload.pageEnd >= 12
    };

    const xp = getDB("xp", { level: 1, total: 320, progress: 32, title: "Dental Starter" });
    xp.total += correctCount * 30 + 50;
    xp.level = Math.floor(xp.total / 1000) + 1;
    xp.progress = Math.round((xp.total % 1000) / 10);
    xp.remaining = 1000 - (xp.total % 1000);
    setDB("xp", xp);

    return { ok: true, data: result };
  }

  // POST /api/sheets/:sheetId/advanced/continue
  const continueAdvancedMatch = cleanPath.match(/\/api\/sheets\/(\d+)\/advanced\/continue/);
  if (continueAdvancedMatch && options.method === "POST") {
    const sheetId = Number(continueAdvancedMatch[1]);
    const payload = JSON.parse(options.body || "{}");
    const pageEnd = Number(payload.pageEnd || 3);

    const nextStart = pageEnd + 1;
    const nextEnd = Math.min(12, nextStart + 2);

    const session = {
      id: `session-${Date.now()}`,
      sheetId,
      mode: "advanced",
      difficulty: payload.difficulty || "Medium",
      sheet: {
        id: sheetId,
        title: "Oral Anatomy Reference Sheet",
        totalPages: 12
      },
      block: {
        pageStart: nextStart,
        pageEnd: nextEnd
      },
      progress: {
        unlockedPages: nextEnd,
        totalPages: 12
      },
      weakPoints: [],
      finalAvailable: nextEnd >= 12
    };

    localStorage.setItem(`dentify.mock.session.${sheetId}`, JSON.stringify(session));
    return { ok: true, data: session };
  }

  // PUT /api/settings/theme
  if (cleanPath === "/api/settings/theme") {
    const payload = JSON.parse(options.body || "{}");
    return { ok: true, data: payload };
  }

  return { ok: false, error: "Mock endpoint not found" };
}
