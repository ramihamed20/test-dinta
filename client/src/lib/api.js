import { supabase } from "./supabaseClient.js";
import { handleMockRequest } from "./mockBackend.js";

const TOKEN_KEY = "dentify.token";
const useSupabase = true; // Set to true to route all API calls to Supabase

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api(path, options = {}) {
  if (!useSupabase) {
    const mockRes = await handleMockRequest(path, options);
    if (!mockRes.ok) {
      throw new Error(mockRes.error || "Mock request failed");
    }
    return mockRes.data;
  }

  try {
    const cleanPath = path.split("?")[0];
    const params = new URLSearchParams(path.split("?")[1] || "");

    // 1. AUTHENTICATION & PROFILE
    if (cleanPath === "/api/auth/login" && options.method === "POST") {
      const payload = JSON.parse(options.body || "{}");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password
      });
      if (error) throw new Error(error.message);

      let { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      if (!profile) {
        const { data: newProfile } = await supabase.from("profiles").upsert({
          id: data.user.id,
          name: data.user.user_metadata?.name || payload.email.split("@")[0],
          email: payload.email,
          year: "3rd Year"
        }).select().single();
        profile = newProfile;
      }

      setToken(data.session.access_token);
      return {
        token: data.session.access_token,
        user: { id: data.user.id, email: data.user.email, name: profile.name, year: profile.year, role: "student" }
      };
    }

    if (cleanPath === "/api/auth/register" && options.method === "POST") {
      const payload = JSON.parse(options.body || "{}");
      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: { data: { name: payload.name } }
      });
      if (error) throw new Error(error.message);

      const user = data.user;
      const { data: profile } = await supabase.from("profiles").upsert({
        id: user.id,
        name: payload.name,
        email: payload.email,
        year: "3rd Year"
      }).select().single();

      if (data.session) {
        setToken(data.session.access_token);
      }
      return {
        token: data.session?.access_token || "mock-token",
        user: { id: user.id, email: user.email, name: payload.name, year: "3rd Year", role: "student" }
      };
    }

    if (cleanPath === "/api/me") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return {
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || user.email.split("@")[0],
        year: profile?.year || "3rd Year",
        role: "student"
      };
    }

    if (cleanPath === "/api/profile" && options.method === "PUT") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload = JSON.parse(options.body || "{}");
      
      const { data, error } = await supabase.from("profiles").upsert({
        id: user.id,
        name: payload.name,
        year: payload.year,
        email: user.email
      }).select().single();
      
      if (error) throw new Error(error.message);
      return data;
    }

    if (cleanPath === "/api/profile/password" && options.method === "PUT") {
      const payload = JSON.parse(options.body || "{}");
      const { error } = await supabase.auth.updateUser({ password: payload.next });
      if (error) throw new Error(error.message);
      return { message: "Password updated successfully" };
    }

    // 2. MATERIALS & SHEETS
    if (cleanPath === "/api/materials") {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: materials, error: matErr } = await supabase.from("materials").select("*").order("order_index");
      if (matErr) throw new Error(matErr.message);

      const { data: attempts } = user ? await supabase.from("attempts").select("question_id, correct").eq("user_id", user.id) : { data: [] };
      const { data: questions } = await supabase.from("questions").select("id, material_id");

      return (materials || []).map(m => {
        const matQuestions = questions?.filter(q => q.material_id === m.id) || [];
        const solvedCount = matQuestions.filter(q => attempts?.some(a => a.question_id === q.id)).length;
        const progress = matQuestions.length ? Math.round((solvedCount / matQuestions.length) * 100) : 0;
        return {
          id: m.id,
          title: m.title,
          slug: m.slug,
          description: m.description,
          icon: m.icon,
          progress,
          questionCount: matQuestions.length
        };
      });
    }

    const sheetsMatch = cleanPath.match(/\/api\/materials\/(\d+)\/sheets/);
    if (sheetsMatch) {
      const matId = Number(sheetsMatch[1]);
      const { data: material } = await supabase.from("materials").select("*").eq("id", matId).single();
      const { data: sheets } = await supabase.from("material_sheets").select("*").eq("material_id", matId).order("sheet_number");
      
      return {
        material,
        sheets: (sheets || []).map(s => ({
          id: s.id,
          sheetNumber: s.sheet_number,
          title: s.title,
          totalPages: s.total_pages,
          summary: s.summary,
          mastered: false,
          bestAverage: 0,
          masteryStatus: "Not started"
        }))
      };
    }

    // 3. QUESTIONS & ATTEMPTS
    if (cleanPath === "/api/questions") {
      const { data: { user } } = await supabase.auth.getUser();
      const materialId = params.get("materialId");
      const difficulty = params.get("difficulty");

      let query = supabase.from("questions").select("*");
      if (materialId) query = query.eq("material_id", materialId);
      if (difficulty) query = query.eq("difficulty", difficulty);
      const { data: questions, error } = await query;
      if (error) throw new Error(error.message);

      const { data: attempts } = user ? await supabase.from("attempts").select("*").eq("user_id", user.id) : { data: [] };
      const { data: bookmarks } = user ? await supabase.from("bookmarks").select("*").eq("user_id", user.id) : { data: [] };

      return (questions || []).map(q => {
        const attempt = attempts?.find(a => a.question_id === q.id);
        const isBookmarked = bookmarks?.some(b => b.target_id === q.id && b.type === "question");
        let choices = [];
        try { choices = JSON.parse(q.choices_json); } catch(e) { choices = q.choices_json; }
        return {
          id: q.id,
          materialId: q.material_id,
          prompt: q.prompt,
          choices,
          correct: q.correct_choice,
          explanation: q.explanation,
          difficulty: q.difficulty,
          attempts: attempt ? 1 : 0,
          correct: attempt ? attempt.correct : false,
          bookmarked: isBookmarked
        };
      });
    }

    const attemptMatch = cleanPath.match(/\/api\/questions\/(\d+)\/attempt/);
    if (attemptMatch && options.method === "POST") {
      const qId = Number(attemptMatch[1]);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload = JSON.parse(options.body || "{}");

      const { data: question } = await supabase.from("questions").select("*").eq("id", qId).single();
      if (!question) throw new Error("Question not found");

      const correct = question.correct_choice === payload.selectedChoice;
      
      const { error } = await supabase.from("attempts").upsert({
        user_id: user.id,
        question_id: qId,
        selected_choice: payload.selectedChoice,
        correct
      });
      if (error) throw new Error(error.message);

      return {
        correct,
        correctAnswer: question.correct_choice,
        explanation: question.explanation
      };
    }

    // 4. BOOKMARKS
    if (cleanPath === "/api/bookmarks") {
      const { data: { user } } = await supabase.auth.getUser();
      if (options.method === "POST") {
        if (!user) throw new Error("Not authenticated");
        const payload = JSON.parse(options.body || "{}");
        const { data: existing } = await supabase.from("bookmarks").select("*").eq("user_id", user.id).eq("target_id", payload.targetId).eq("type", payload.type).maybeSingle();
        if (existing) {
          await supabase.from("bookmarks").delete().eq("id", existing.id);
        } else {
          await supabase.from("bookmarks").insert({ user_id: user.id, type: payload.type, target_id: payload.targetId });
        }
        return { success: true };
      }

      // GET Bookmarks
      const { data: bookmarks } = user ? await supabase.from("bookmarks").select("*").eq("user_id", user.id) : { data: [] };
      const { data: questions } = await supabase.from("questions").select("id, prompt");
      
      return (bookmarks || []).map(b => {
        const q = questions?.find(item => item.id === b.target_id);
        return {
          id: b.id,
          type: b.type,
          title: q ? q.prompt : "Bookmarked Item",
          meta: q ? `Bookmark #${q.id}` : "Saved material"
        };
      });
    }

    const deleteBookmarkMatch = cleanPath.match(/\/api\/bookmarks\/(\d+)/);
    if (deleteBookmarkMatch && options.method === "DELETE") {
      const bId = Number(deleteBookmarkMatch[1]);
      const { error } = await supabase.from("bookmarks").delete().eq("id", bId);
      if (error) throw new Error(error.message);
      return { success: true };
    }

    // 5. COMMUNITY POSTS
    if (cleanPath === "/api/community") {
      const { data: posts, error } = await supabase.from("community_posts").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      
      const { data: profiles } = await supabase.from("profiles").select("id, name");

      return (posts || []).map(p => {
        const profile = profiles?.find(prof => prof.id === p.user_id);
        return {
          id: p.id,
          authorEmail: p.user_id,
          authorName: profile?.name || "Dental Student",
          tag: p.tag,
          body: p.body,
          likes: 0,
          replies: 0,
          created_at: p.created_at
        };
      });
    }

    if ((cleanPath === "/api/community" || cleanPath === "/api/community/posts") && options.method === "POST") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload = JSON.parse(options.body || "{}");

      const { data, error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        tag: payload.tag || "Study tip",
        body: payload.body
      }).select().single();
      
      if (error) throw new Error(error.message);
      return data;
    }

    // 6. LEADERBOARD & RANKED
    if (cleanPath === "/api/ranked") {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle() : { data: null };
      const { data: attempts } = user ? await supabase.from("attempts").select("question_id, correct").eq("user_id", user.id) : { data: [] };

      const questionsSolved = attempts?.length || 0;
      const correctCount = attempts?.filter(a => a.correct).length || 0;
      const accuracy = questionsSolved ? Math.round((correctCount / questionsSolved) * 100) : 100;
      
      const userPoints = Math.max(
        3680,
        questionsSolved * 75 + correctCount * 30
      );

      const userName = profile?.name || user?.user_metadata?.name || "Demo User";
      const userYear = profile?.year || "3rd Year";

      const weeklyRankings = [
        { rank: 1, name: "Lina A.", label: "Intern · 94% accuracy", metric: "186 solved", accuracy: 94 },
        { rank: 2, name: "Sami H.", label: "5th Year · 91% accuracy", metric: "162 solved", accuracy: 91 },
        { rank: 3, name: "Omar D.", label: "4th Year · 88% accuracy", metric: "148 solved", accuracy: 88 },
        { rank: 4, name: "Nour M.", label: "3rd Year · 85% accuracy", metric: "135 solved", accuracy: 85 },
        { rank: 5, name: userName, label: `${userYear} · ${accuracy}% accuracy`, metric: `${questionsSolved} solved`, accuracy: accuracy }
      ].sort((a, b) => b.accuracy - a.accuracy || b.rank - a.rank);

      const solverRankings = [
        { rank: 1, name: "Omar D.", label: "4th Year · 94% accuracy", metric: "2,480 pts", accuracy: 94 },
        { rank: 2, name: "Lina A.", label: "Intern · 91% accuracy", metric: "2,210 pts", accuracy: 91 },
        { rank: 3, name: "Sami H.", label: "5th Year · 88% accuracy", metric: "1,980 pts", accuracy: 88 },
        { rank: 4, name: userName, label: `${userYear} · ${accuracy}% accuracy`, metric: `${userPoints.toLocaleString()} pts`, accuracy: accuracy }
      ].sort((a, b) => b.accuracy - a.accuracy || b.rank - a.rank);

      const finalWeekly = weeklyRankings.map((item, idx) => ({ ...item, rank: idx + 1 }));
      const finalSolver = solverRankings.map((item, idx) => ({ ...item, rank: idx + 1 }));
      const userPosition = finalSolver.find((item) => item.name === userName);

      return {
        featured: {
          name: finalWeekly[0]?.name || "Lina A.",
          metric: finalWeekly[0]?.metric || "186 solved",
          accuracy: finalWeekly[0]?.accuracy || 94
        },
        currentUser: {
          rank: userPosition?.rank || 4,
          percentile: "Top 12%",
          points: userPoints,
          accuracy: Math.max(accuracy, 84)
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
      };
    }

    // 7. STUDY PLAN
    if (cleanPath === "/api/study-plan" && options.method === "POST") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload = JSON.parse(options.body || "{}");

      const { data, error } = await supabase.from("study_plan").insert({
        user_id: user.id,
        time: payload.time,
        topic: payload.topic
      }).select().single();

      if (error) throw new Error(error.message);
      return data;
    }

    const editStudyPlanMatch = cleanPath.match(/\/api\/study-plan\/([\w-]+)/);
    if (editStudyPlanMatch && options.method === "PUT") {
      const pId = Number(editStudyPlanMatch[1]) || editStudyPlanMatch[1];
      const payload = JSON.parse(options.body || "{}");
      const { data, error } = await supabase.from("study_plan").update({
        time: payload.time,
        topic: payload.topic
      }).eq("id", pId).select().single();

      if (error) throw new Error(error.message);
      return data;
    }

    const deleteStudyPlanMatch = cleanPath.match(/\/api\/study-plan\/([\w-]+)/);
    if (deleteStudyPlanMatch && options.method === "DELETE") {
      const pId = Number(deleteStudyPlanMatch[1]) || deleteStudyPlanMatch[1];
      const { error } = await supabase.from("study_plan").delete().eq("id", pId);
      if (error) throw new Error(error.message);
      return { success: true };
    }

    // 8. DASHBOARD
    if (cleanPath === "/api/dashboard") {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: materials } = await supabase.from("materials").select("*").order("order_index");
      const { data: attempts } = user ? await supabase.from("attempts").select("question_id, correct").eq("user_id", user.id) : { data: [] };
      const { data: questions } = await supabase.from("questions").select("id, material_id");

      const enrichedMaterials = (materials || []).map(m => {
        const matQuestions = questions?.filter(q => q.material_id === m.id) || [];
        const solvedCount = matQuestions.filter(q => attempts?.some(a => a.question_id === q.id)).length;
        const progress = matQuestions.length ? Math.round((solvedCount / matQuestions.length) * 100) : 0;
        return {
          id: m.id,
          title: m.title,
          slug: m.slug,
          description: m.description,
          icon: m.icon,
          progress
        };
      });

      const questionsSolved = attempts?.length || 0;
      const correctCount = attempts?.filter(a => a.correct).length || 0;
      const accuracy = questionsSolved ? Math.round((correctCount / questionsSolved) * 100) : 100;
      
      const { data: studyPlan } = user ? await supabase.from("study_plan").select("*").eq("user_id", user.id).order("time") : { data: [] };
      const { data: bookmarks } = user ? await supabase.from("bookmarks").select("*").eq("user_id", user.id) : { data: [] };

      const xp = {
        level: Math.floor(questionsSolved / 10) + 1,
        total: questionsSolved * 20,
        progress: (questionsSolved % 10) * 10,
        title: "Dental Starter"
      };

      const stats = {
        materialsCompleted: enrichedMaterials.filter(m => m.progress === 100).length,
        questionsSolved,
        accuracy,
        dueReviewCount: 3,
        savedItems: bookmarks?.length || 0,
        reviewCount: 3,
        dailyGoal: { target: 15, solvedToday: Math.min(15, questionsSolved), progress: Math.round((Math.min(15, questionsSolved) / 15) * 100), remaining: Math.max(0, 15 - questionsSolved) },
        xp
      };

      return {
        stats,
        nextMaterial: enrichedMaterials[0] || null,
        materials: enrichedMaterials,
        review: [
          { id: 1, reason: "Dissolving organic tissue block", due_at: new Date().toISOString() },
          { id: 2, reason: "Local anesthesia safety blocks", due_at: new Date().toISOString() }
        ],
        weeklyChallenge: { title: "Solver Sprint", progress: Math.min(100, Math.round((questionsSolved / 50) * 100)), solved: questionsSolved, target: 50, rewardXp: 250, remaining: Math.max(0, 50 - questionsSolved) },
        studyPlan: studyPlan || [],
        insight: { title: "Study recommendation", body: "Spend 25 minutes reviewing oral histology sheets for better exam retention.", actionLabel: "Review histology", actionPath: "/materials/2" }
      };
    }

    // 9. ANALYTICS & PROGRESS
    if (cleanPath === "/api/analytics") {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: attempts } = user ? await supabase.from("attempts").select("question_id, correct").eq("user_id", user.id) : { data: [] };
      
      const questionsSolved = attempts?.length || 0;
      const correctCount = attempts?.filter(a => a.correct).length || 0;
      const accuracy = questionsSolved ? Math.round((correctCount / questionsSolved) * 100) : 85;

      return {
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
      };
    }

    if (cleanPath === "/api/progress") {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: attempts } = user ? await supabase.from("attempts").select("question_id, correct").eq("user_id", user.id) : { data: [] };
      const { data: questions } = await supabase.from("questions").select("id, material_id");
      const { data: materials } = await supabase.from("materials").select("*").order("order_index");
      const { data: bookmarks } = user ? await supabase.from("bookmarks").select("*").eq("user_id", user.id) : { data: [] };

      const enrichedMaterials = (materials || []).map(m => {
        const matQuestions = questions?.filter(q => q.material_id === m.id) || [];
        const solvedCount = matQuestions.filter(q => attempts?.some(a => a.question_id === q.id)).length;
        const progress = matQuestions.length ? Math.round((solvedCount / matQuestions.length) * 100) : 0;
        return {
          id: m.id,
          title: m.title,
          slug: m.slug,
          description: m.description,
          icon: m.icon,
          progress,
          attempts: solvedCount,
          accuracy: 100
        };
      });

      const questionsSolved = attempts?.length || 0;
      const correctCount = attempts?.filter(a => a.correct).length || 0;
      const accuracy = questionsSolved ? Math.round((correctCount / questionsSolved) * 100) : 100;

      return {
        stats: {
          materialsCompleted: enrichedMaterials.filter(m => m.progress === 100).length,
          questionsSolved,
          accuracy,
          savedItems: bookmarks?.length || 0,
          dueReviewCount: 3
        },
        materials: enrichedMaterials,
        solvedByDay: [
          { day: "Mon", count: questionsSolved }
        ]
      };
    }

    // 10. ACHIEVEMENTS
    if (cleanPath === "/api/achievements") {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: achievements } = await supabase.from("achievements").select("*").order("order_index");
      const { data: attempts } = user ? await supabase.from("attempts").select("question_id, correct").eq("user_id", user.id) : { data: [] };
      const { data: studyPlan } = user ? await supabase.from("study_plan").select("*").eq("user_id", user.id) : { data: [] };
      const { data: bookmarks } = user ? await supabase.from("bookmarks").select("*").eq("user_id", user.id) : { data: [] };

      const solvedCount = attempts?.length || 0;
      
      const mapped = (achievements || []).map(a => {
        let value = 0;
        if (a.metric === "questionsSolved" || a.metric === "solved") value = solvedCount;
        else if (a.metric === "streakDays" || a.metric === "streak") value = 4;
        else if (a.metric === "study-plan") value = studyPlan?.length || 0;
        else if (a.metric === "savedItems") value = bookmarks?.length || 0;

        const unlocked = value >= a.threshold;
        const progress = Math.min(100, Math.round((value / a.threshold) * 100));

        return {
          id: a.id,
          title: a.title,
          description: a.description,
          icon: a.icon,
          threshold: a.threshold,
          value,
          unlocked,
          progress
        };
      });

      const unlockedCount = mapped.filter(a => a.unlocked).length;
      const total = mapped.length;
      const completion = total ? Math.round((unlockedCount / total) * 100) : 0;

      return {
        summary: { unlocked: unlockedCount, total, completion },
        achievements: mapped,
        newlyUnlocked: []
      };
    }

    // 11. REVIEW & MISTAKES
    if (cleanPath === "/api/review") {
      // Return a clean mock array of review tasks for testing
      return [
        { id: 1, type: "material", title: "Oral Anatomy Revision", reason: "Scored < 80% on morphology", due_at: new Date().toISOString() },
        { id: 2, type: "question", title: "Review Mandibular Nerve Block", reason: "Answered incorrectly twice", due_at: new Date().toISOString() }
      ];
    }

    if (cleanPath === "/api/advanced/mistakes") {
      return []; // Return empty list of advanced mistakes for testing
    }

    const reviewCompleteMatch = cleanPath.match(/\/api\/review\/(\d+)\/complete/);
    if (reviewCompleteMatch && options.method === "POST") {
      return { success: true };
    }

    // 12. SHEETS QUIZ START / SUBMIT / CONTINUE
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
      return session;
    }

    const getQuizMatch = cleanPath.match(/\/api\/sheets\/(\d+)\/quiz/);
    if (getQuizMatch) {
      const isFinal = params.get("final") === "1";
      const difficulty = params.get("difficulty") || "Medium";

      const mockQuizQuestions = [
        { id: 101, prompt: "What is the primary organic component of enamel?", choices: ["Amelogenin", "Collagen", "Water", "Hydroxyapatite"], correct: "Amelogenin", explanation: "Amelogenin makes up about 90% of the organic matrix of developing enamel.", difficulty },
        { id: 102, prompt: "Which type of dentin is formed after root completion?", choices: ["Primary dentin", "Secondary dentin", "Tertiary dentin", "Sclerotic dentin"], correct: "Secondary dentin", explanation: "Secondary dentin is formed after root formation is complete and continues throughout life.", difficulty },
        { id: 103, prompt: "What is the thickness of the enamel at the incisal edge of a newly erupted incisor?", choices: ["0.5 mm", "1.0 mm", "2.0 mm", "3.0 mm"], correct: "2.0 mm", explanation: "Enamel is thickest at the incisal edge (about 2.0 mm) and thinnest at the CEJ.", difficulty }
      ];

      return {
        pageStart: 1,
        pageEnd: 3,
        isFinal,
        variant: 0,
        questions: mockQuizQuestions
      };
    }

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
      return {
        sheetId,
        pageStart: payload.pageStart,
        pageEnd: payload.pageEnd,
        correctCount,
        totalCount: answers.length,
        accuracy,
        weakPoints: wrongQuestions,
        finalAvailable: payload.pageEnd >= 12
      };
    }

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
      return session;
    }

    if (cleanPath === "/api/settings/theme") {
      const payload = JSON.parse(options.body || "{}");
      return payload;
    }

    throw new Error(`Endpoint not supported on Supabase: ${cleanPath}`);
  } catch (err) {
    console.error("Supabase API Bridge Error:", err);
    throw err;
  }
}

export const authApi = {
  me: () => api("/api/me"),
  login: (payload) => api("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => api("/api/auth/register", { method: "POST", body: JSON.stringify(payload) })
};
