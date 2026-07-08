import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { sessionLengthOptions } from "../lib/constants.js";
import { formatDuration, readSessionCountPreference } from "../lib/utils.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { useQuestionData } from "../hooks/useQuestionData.js";
import { Page, LoadingPanel, ErrorPanel, ProgressLine, EmptyState, SessionConfetti } from "../components/ui/index.jsx";
import { QuestionCard } from "../components/shared/QuestionCard.jsx";

export default function Questions() {
  const query = new URLSearchParams(useLocation().search);
  const materialId = query.get("materialId") || "";
  const difficulty = query.get("difficulty") || "";
  const searchText = query.get("search") || "";
  const [selected, setSelected] = useState({});
  const [feedback, setFeedback] = useState({});
  const [mode, setMode] = useState("bank");
  const [session, setSession] = useState(null);
  const [sessionCount, setSessionCount] = useState(readSessionCountPreference);
  const { data: materials } = useAsyncData(() => api("/api/materials"), []);
  const { loading, error, data, setState } = useQuestionData(materialId, difficulty);

  useEffect(() => {
    localStorage.setItem("dentify.session.count", JSON.stringify(sessionCount));
  }, [sessionCount]);

  useEffect(() => {
    setSession(null);
    setMode("bank");
    setSelected({});
    setFeedback({});
  }, [materialId, difficulty]);

  function questionLink(next = {}) {
    const params = new URLSearchParams();
    const nextMaterialId = Object.prototype.hasOwnProperty.call(next, "materialId") ? next.materialId : materialId;
    const nextDifficulty = Object.prototype.hasOwnProperty.call(next, "difficulty") ? next.difficulty : difficulty;
    if (nextMaterialId) params.set("materialId", nextMaterialId);
    if (nextDifficulty) params.set("difficulty", nextDifficulty);
    const qs = params.toString();
    return qs ? `/questions?${qs}` : "/questions";
  }

  const answer = useCallback(async (question, choice) => {
    setSelected((prev) => {
      if (prev[question.id]) return prev;
      return { ...prev, [question.id]: choice };
    });
    try {
      const result = await api(`/api/questions/${question.id}/attempt`, {
        method: "POST",
        body: JSON.stringify({ selectedChoice: choice })
      });
      setFeedback((prev) => ({ ...prev, [question.id]: result }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const bookmark = useCallback(async (question) => {
    try {
      await api("/api/bookmarks", { method: "POST", body: JSON.stringify({ type: "question", targetId: question.id }) });
      setState((current) => ({
        ...current,
        data: current.data.map((item) => (item.id === question.id ? { ...item, bookmarked: true } : item))
      }));
    } catch (err) {
      console.error(err);
    }
  }, [setState]);

  function startSession() {
    const requestedCount = sessionCount === "all" ? data.length : Number(sessionCount);
    const questions = data.slice(0, Math.min(requestedCount, data.length));
    if (!questions.length) return;
    setMode("session");
    setSession({
      questions,
      index: 0,
      answers: {},
      feedback: {},
      startedAt: Date.now(),
      completedAt: null,
      complete: false
    });
  }

  async function answerSessionQuestion(question, choice) {
    if (!session || session.answers[question.id]) return;
    const result = await api(`/api/questions/${question.id}/attempt`, {
      method: "POST",
      body: JSON.stringify({ selectedChoice: choice })
    });
    setSession((current) => ({
      ...current,
      answers: { ...current.answers, [question.id]: choice },
      feedback: { ...current.feedback, [question.id]: result }
    }));
  }

  function goNextSessionQuestion() {
    setSession((current) => {
      const nextIndex = current.index + 1;
      if (nextIndex >= current.questions.length) return { ...current, completedAt: Date.now(), complete: true };
      return { ...current, index: nextIndex };
    });
  }

  function retryMissedQuestions() {
    setSession((current) => {
      const missed = current.questions.filter((item) => !current.feedback[item.id]?.isCorrect);
      if (!missed.length) return current;
      return {
        questions: missed,
        index: 0,
        answers: {},
        feedback: {},
        startedAt: Date.now(),
        completedAt: null,
        complete: false
      };
    });
  }

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;

  // Filter by search text from topbar
  const filteredData = searchText
    ? data.filter((q) => {
        const term = searchText.toLowerCase();
        return (
          (q.text || "").toLowerCase().includes(term) ||
          (q.choices || []).some((c) => (c.text || "").toLowerCase().includes(term)) ||
          (q.explanation || "").toLowerCase().includes(term)
        );
      })
    : data;

  const plannedSessionCount = sessionCount === "all" ? filteredData.length : Math.min(Number(sessionCount), filteredData.length);
  const activeMaterial = (materials || []).find((material) => String(material.id) === String(materialId));
  const activeFilters = [
    activeMaterial?.title,
    difficulty && `${difficulty} level`,
    searchText && `"${searchText}"`
  ].filter(Boolean);

  if (mode === "flashcards") {
    return (
      <Page title="Questions" subtitle="Flip through question cards for fast recall.">
        <FlashcardMode questions={data} onExit={() => setMode("bank")} />
      </Page>
    );
  }

  if (mode === "session" && session) {
    return (
      <Page title="Questions" subtitle="A focused practice session with one question at a time.">
        <QuestionSession
          session={session}
          onAnswer={answerSessionQuestion}
          onNext={goNextSessionQuestion}
          onExit={() => { setSession(null); setMode("bank"); }}
          onRestart={startSession}
          onRetryMissed={retryMissedQuestions}
        />
      </Page>
    );
  }

  return (
    <Page title="Questions" subtitle="Practice with answer feedback and review capture.">
      {(materialId || difficulty || searchText) && (
        <section className="question-context" aria-label="Active question filters">
          <div>
            <Link className="back-link" to="/questions"><Icon name="chevron-left" size={16} /> All questions</Link>
            <h2>{activeFilters.join(" · ")}</h2>
            <p>{filteredData.length} matching {filteredData.length === 1 ? "question" : "questions"} ready for practice.</p>
          </div>
          <Link className="btn btn-soft" to="/questions"><Icon name="x" size={16} /> Clear filters</Link>
        </section>
      )}
      <section className="study-mode-launcher">
        <div className="session-count-picker" aria-label="Focused session question count">
          <span>Session length</span>
          {sessionLengthOptions.map((count) => (
            <button key={count} className={sessionCount === count ? "active" : ""} onClick={() => setSessionCount(count)} type="button" aria-pressed={sessionCount === count}>
              {count === "all" ? "All" : count}
            </button>
          ))}
        </div>
        <button className="mode-card" onClick={startSession} disabled={!filteredData.length}>
          <span className="stat-icon"><Icon name="target" /></span>
          <strong>Focused session</strong>
          <small>{plannedSessionCount} questions, one card at a time</small>
        </button>
        <button className="mode-card" onClick={() => setMode("flashcards")} disabled={!filteredData.length}>
          <span className="stat-icon"><Icon name="layers" /></span>
          <strong>Flashcards</strong>
          <small>Flip question, answer, and explanation</small>
        </button>
      </section>
      <div className="filter-group" aria-label="Question difficulty filter">
        {["", "Easy", "Medium", "Hard"].map((level) => (
          <Link key={level || "all"} className={difficulty === level ? "active" : ""} to={questionLink({ difficulty: level })}>
            {level || "All levels"}
          </Link>
        ))}
      </div>
      <div className="tabs-row">
        <Link className={!materialId ? "active" : ""} to={questionLink({ materialId: "" })}>All</Link>
        {(materials || []).map((material) => (
          <Link key={material.id} className={materialId === String(material.id) ? "active" : ""} to={questionLink({ materialId: String(material.id) })}>{material.title}</Link>
        ))}
      </div>
      <section className="question-grid">
        {filteredData.map((question) => (
          <QuestionCard key={question.id} question={question} selected={selected[question.id]} feedback={feedback[question.id]} onAnswer={answer} onBookmark={bookmark} />
        ))}
        {filteredData.length === 0 && <EmptyState title="No matches" text={searchText ? `No questions match "${searchText}".` : "No questions match your current filters."} />}
      </section>
    </Page>
  );
}

function FlashcardMode({ questions, onExit }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const total = questions.length;
  const question = questions[index];

  function move(nextIndex) {
    setIndex(Math.max(0, Math.min(total - 1, nextIndex)));
    setFlipped(false);
  }

  if (!question) {
    return <EmptyState title="No flashcards yet" text="Questions will become flashcards once the bank has data." />;
  }

  return (
    <section className="flashcard-mode">
      <div className="session-top">
        <div>
          <p className="eyebrow">Flashcard {index + 1} of {total}</p>
          <h2>{question.materialTitle}</h2>
        </div>
        <button className="btn btn-outline" onClick={onExit}>Back to question bank</button>
      </div>
      <ProgressLine value={Math.round(((index + 1) / total) * 100)} />
      <button className={`flashcard ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((value) => !value)} aria-pressed={flipped}>
        <span className="pill">{flipped ? "Answer" : "Question"}</span>
        {!flipped ? (
          <>
            <strong>{question.prompt}</strong>
            <small>Tap to reveal the answer.</small>
          </>
        ) : (
          <>
            <strong>{question.correctChoice}</strong>
            <p>{question.explanation}</p>
          </>
        )}
      </button>
      <div className="session-actions">
        <button className="btn btn-soft" onClick={() => move(index - 1)} disabled={index === 0}>Previous</button>
        <button className="btn btn-primary" onClick={() => move(index + 1)} disabled={index === total - 1}>Next card</button>
      </div>
    </section>
  );
}

function QuestionSession({ session, onAnswer, onNext, onExit, onRestart, onRetryMissed }) {
  const [now, setNow] = useState(Date.now());
  const question = session.questions[session.index];
  const selected = question ? session.answers[question.id] : "";
  const feedback = question ? session.feedback[question.id] : null;
  const answeredCount = Object.keys(session.answers).length;
  const correctCount = Object.values(session.feedback).filter((item) => item.isCorrect).length;
  const remainingCount = Math.max(0, session.questions.length - answeredCount);
  const xpEarned = Object.values(session.feedback).reduce((total, item) => total + (item.xpAwarded || 0), 0);
  const score = session.questions.length ? Math.round((correctCount / session.questions.length) * 100) : 0;
  const canContinue = Boolean(selected);
  const elapsedSeconds = Math.max(0, Math.round(((session.completedAt || now) - (session.startedAt || now)) / 1000));
  const averageSeconds = answeredCount ? Math.round(elapsedSeconds / answeredCount) : 0;

  useEffect(() => {
    if (session.complete) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session.complete, session.startedAt]);

  if (session.complete) {
    const missed = session.questions.filter((item) => !session.feedback[item.id]?.isCorrect);
    return (
      <section className="session-result">
        <article className="result-hero">
          {score >= 80 && <SessionConfetti />}
          <div>
            <p className="eyebrow">Session complete</p>
            <h2>{score}%</h2>
            <p>{correctCount}/{session.questions.length} correct. {score >= 80 ? "Strong recall." : "Mark the weak ones and repeat."}</p>
          </div>
          <div className="result-stats">
            <div className="xp-card"><span>Answered</span><strong>{answeredCount}</strong></div>
            <div className="xp-card reward"><span>XP earned</span><strong>+{xpEarned}</strong></div>
            <div className="xp-card timer"><span>Time</span><strong>{formatDuration(elapsedSeconds)}</strong></div>
          </div>
        </article>
        <article className="panel mistake-review">
          <div className="panel-title"><h2>Review misses</h2><span>{missed.length}</span></div>
          {missed.length ? missed.map((item) => (
            <div className="mistake-row" key={item.id}>
              <span className="pill">{item.materialTitle}</span>
              <h3>{item.prompt}</h3>
              <p>Your answer: <strong>{session.answers[item.id] || "No answer"}</strong></p>
              <p>Correct answer: <strong>{session.feedback[item.id]?.correctChoice}</strong></p>
              <small>{session.feedback[item.id]?.explanation}</small>
            </div>
          )) : <p className="muted">Clean run. Nothing to review from this session.</p>}
        </article>
        <div className="result-actions">
          {missed.length > 0 && <button className="btn btn-primary" onClick={onRetryMissed}>Review misses again</button>}
          <button className="btn btn-primary" onClick={onRestart}>Restart session</button>
          <button className="btn btn-outline" onClick={onExit}>Back to question bank</button>
        </div>
      </section>
    );
  }

  return (
    <section className="session-panel">
      <div className="session-top">
        <div>
          <p className="eyebrow">Question {session.index + 1} of {session.questions.length}</p>
          <h2>{question.prompt}</h2>
        </div>
        <button className="btn btn-danger" onClick={onExit}>Exit session</button>
      </div>
      <ProgressLine value={Math.round(((session.index + 1) / session.questions.length) * 100)} />
      <div className="session-metrics" aria-label="Session progress summary">
        <span><strong>{answeredCount}</strong> answered</span>
        <span><strong>{correctCount}</strong> correct</span>
        <span><strong>{remainingCount}</strong> remaining</span>
        <span className="session-timer"><strong>{formatDuration(elapsedSeconds)}</strong> elapsed</span>
        <span><strong>{averageSeconds ? formatDuration(averageSeconds) : "--"}</strong> avg/question</span>
      </div>
      <QuestionCard question={question} selected={selected} feedback={feedback} onAnswer={onAnswer} onBookmark={() => {}} hideBookmark />
      <div className="session-actions">
        <span>{correctCount} correct so far</span>
        <button className="btn btn-primary" onClick={onNext} disabled={!canContinue}>
          {session.index + 1 === session.questions.length ? "Finish session" : "Next question"}
        </button>
      </div>
    </section>
  );
}
