import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { focusDurations, onboardingDefaults, quotes } from "../lib/constants.js";
import {
  formatDuration,
  levelMemoryKey,
  onboardingKey,
  readFocusDurationPreference,
  readOnboardingState,
  relativeTime,
  themePreview
} from "../lib/utils.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { EmptyState, LoadingPanel, ErrorPanel, ProgressLine, SessionConfetti } from "../components/ui/index.jsx";
import { LevelUpToast } from "../components/shared/index.jsx";
import { StatsGrid } from "../components/shared/StatsGrid.jsx";
import { InstallPrompt } from "../components/shared/InstallPrompt.jsx";

// --- Dashboard ---

export default function Dashboard({ themeSettings, activeTheme, user, deferredPrompt, onClearInstallPrompt }) {
  const { loading, error, data } = useAsyncData(() => api("/api/dashboard"), []);
  const [onboarding, setOnboarding] = useState(() => readOnboardingState(user?.email));
  const [editingOnboarding, setEditingOnboarding] = useState(false);
  const [levelToast, setLevelToast] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(
    () => sessionStorage.getItem("dentify.pwa.dismissed") === "true"
  );

  useEffect(() => {
    setOnboarding(readOnboardingState(user?.email));
    setEditingOnboarding(false);
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    localStorage.setItem(onboardingKey(user.email), JSON.stringify(onboarding));
  }, [user?.email, onboarding]);

  useEffect(() => {
    const currentLevel = data?.stats?.xp?.level;
    if (!currentLevel || !user?.email) return;
    const key = levelMemoryKey(user.email);
    const previousLevel = Number(localStorage.getItem(key) || "0");
    if (!previousLevel) {
      localStorage.setItem(key, String(currentLevel));
      return;
    }
    if (currentLevel > previousLevel) {
      setLevelToast({ level: currentLevel, title: data.stats.xp.title });
      localStorage.setItem(key, String(currentLevel));
    }
    if (currentLevel < previousLevel) {
      localStorage.setItem(key, String(currentLevel));
    }
  }, [data?.stats?.xp?.level, data?.stats?.xp?.title, user?.email]);

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  const selectedMaterial = data.materials?.find((item) => String(item.id) === String(onboarding.focusMaterialId)) || data.nextMaterial || data.materials?.[0];
  const activeInsight = onboarding.completed
    ? null
    : (data.insight || {
        title: "Today's focus",
        body: quotes[0],
        actionLabel: "Practice now",
        actionPath: "/questions"
      });

  return (
    <div className="dashboard-layout">
      {levelToast && <LevelUpToast level={levelToast.level} title={levelToast.title} onDismiss={() => setLevelToast(null)} />}
      {(!onboarding.completed || editingOnboarding) && (
        <OnboardingWizard
          materials={data.materials || []}
          defaultMaterialId={selectedMaterial?.id || ""}
          value={onboarding}
          allowDismiss={editingOnboarding}
          onSave={(next) => {
            setOnboarding({ ...next, completed: true });
            setEditingOnboarding(false);
          }}
          onSkip={() => {
            setOnboarding({ ...onboardingDefaults, completed: true });
            setEditingOnboarding(false);
          }}
          onDismiss={() => {
            setEditingOnboarding(false);
          }}
        />
      )}
      {!installDismissed && deferredPrompt && (
        <InstallPrompt
          deferredPrompt={deferredPrompt}
          onInstall={onClearInstallPrompt}
          onDismiss={() => {
            setInstallDismissed(true);
            sessionStorage.setItem("dentify.pwa.dismissed", "true");
          }}
        />
      )}
      <StatsGrid stats={data.stats} />
      <section className="dashboard-main">
        <div className="dashboard-left">
          {onboarding.completed && (
            <OnboardingSummaryCard
              onboarding={onboarding}
              material={selectedMaterial}
              onEdit={() => setEditingOnboarding(true)}
            />
          )}
          <ContinueCard material={data.nextMaterial} />
          <DailyGoalCard goal={data.stats.dailyGoal} />
          <DashboardReviewCard items={data.review || []} dueCount={data.stats.dueReviewCount || 0} totalCount={data.stats.reviewCount || 0} />
        </div>
        <div className="dashboard-right">
          <DashboardHero insight={activeInsight} character={themeSettings.character} theme={activeTheme} />
          <FocusTimerCard />
          <StudyTable initialItems={data.studyPlan} />
        </div>
      </section>
    </div>
  );
}

// --- Sub-components ---


function ContinueCard({ material }) {
  const progress = material?.progress || 0;
  return (
    <article className="panel continue-card">
      <p className="eyebrow">Continue Studying</p>
      <h2>{material?.title || "Oral Histology"}</h2>
      <ProgressLine value={Math.max(progress, 20)} />
      <div className="progress-meta"><span>Next review: 12 questions</span><strong>{Math.max(progress, 20)}%</strong></div>
      <Link className="btn btn-primary" to="/materials">Continue</Link>
    </article>
  );
}

function DailyGoalCard({ goal }) {
  const target = goal?.target || 15;
  const solvedToday = goal?.solvedToday || 0;
  const progress = goal?.progress || 0;
  const remaining = goal?.remaining ?? Math.max(0, target - solvedToday);
  const message = remaining === 0 ? "Goal complete. Keep the streak calm." : `${remaining} questions left for today's target.`;
  return (
    <article className="panel daily-goal-card">
      <div className="daily-goal-ring" style={{ "--goal-progress": `${progress}%` }}>
        <strong>{progress}%</strong>
        <span>today</span>
      </div>
      <div>
        <p className="eyebrow">Daily Goal</p>
        <h2>{solvedToday}/{target} questions</h2>
        <p>{message}</p>
        <Link className="btn btn-soft" to="/questions">Practice now</Link>
      </div>
    </article>
  );
}

function OnboardingSummaryCard({ onboarding, material, onEdit }) {
  return (
    <article className="panel onboarding-summary-card">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Your plan</p>
          <h2>Onboarding complete</h2>
        </div>
        <button className="icon-btn" onClick={onEdit} aria-label="Edit onboarding setup"><Icon name="settings" size={16} /></button>
      </div>
      <div className="onboarding-summary-grid">
        <div>
          <span>Daily target</span>
          <strong>{onboarding.dailyTarget}</strong>
        </div>
        <div>
          <span>Focus subject</span>
          <strong>{material?.title || "Next material"}</strong>
        </div>
        <div>
          <span>Focus block</span>
          <strong>{onboarding.focusMinutes} min</strong>
        </div>
      </div>
      <Link className="btn btn-primary" to={material?.id ? `/questions?materialId=${material.id}` : "/questions"}>Start with this plan</Link>
    </article>
  );
}

function OnboardingWizard({ materials, defaultMaterialId, value, allowDismiss, onSave, onSkip, onDismiss }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => ({
    dailyTarget: value.dailyTarget || onboardingDefaults.dailyTarget,
    focusMaterialId: value.focusMaterialId || String(defaultMaterialId || materials[0]?.id || ""),
    focusMinutes: value.focusMinutes || onboardingDefaults.focusMinutes
  }));

  useEffect(() => {
    setDraft({
      dailyTarget: value.dailyTarget || onboardingDefaults.dailyTarget,
      focusMaterialId: value.focusMaterialId || String(defaultMaterialId || materials[0]?.id || ""),
      focusMinutes: value.focusMinutes || onboardingDefaults.focusMinutes
    });
    setStep(0);
  }, [value, defaultMaterialId, materials]);

  const selectedMaterial = materials.find((item) => String(item.id) === String(draft.focusMaterialId)) || materials[0];
  const totalSteps = 3;
  const stepTitles = ["Set your daily target", "Choose your first subject", "Pick your focus block"];

  function finish() {
    onSave({
      completed: true,
      dailyTarget: draft.dailyTarget,
      focusMaterialId: draft.focusMaterialId || String(selectedMaterial?.id || ""),
      focusMinutes: draft.focusMinutes
    });
  }

  return (
    <div className="onboarding-backdrop" role="dialog" aria-modal="true" aria-label="Dentify onboarding">
      <article className="panel onboarding-modal">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Welcome to Dentify</p>
            <h2>{stepTitles[step]}</h2>
          </div>
          <span>{step + 1}/{totalSteps}</span>
        </div>
        <div className="onboarding-progress">
          <i><b style={{ width: `${Math.round(((step + 1) / totalSteps) * 100)}%` }} /></i>
        </div>
        {step === 0 && (
          <div className="choice-grid onboarding-choice-grid">
            {[10, 15, 20].map((target) => (
              <button key={target} type="button" className={draft.dailyTarget === target ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, dailyTarget: target }))}>
                <strong>{target}</strong>
                <span>questions/day</span>
              </button>
            ))}
          </div>
        )}
        {step === 1 && (
          <div className="choice-grid onboarding-choice-grid subject-grid">
            {materials.map((material) => (
              <button key={material.id} type="button" className={String(draft.focusMaterialId) === String(material.id) ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, focusMaterialId: String(material.id) }))}>
                <strong>{material.title}</strong>
                <span>{material.description}</span>
              </button>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="choice-grid onboarding-choice-grid">
            {focusDurations.map((item) => (
              <button key={item.minutes} type="button" className={draft.focusMinutes === item.minutes ? "active" : ""} onClick={() => setDraft((current) => ({ ...current, focusMinutes: item.minutes }))}>
                <strong>{item.minutes}</strong>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="onboarding-summary-line">
          <span>{draft.dailyTarget} questions/day</span>
          <span>{selectedMaterial?.title || "Choose a subject"}</span>
          <span>{draft.focusMinutes} min blocks</span>
        </div>
        <div className="focus-timer-actions">
          {step > 0 ? (
            <button className="btn btn-soft" type="button" onClick={() => setStep((current) => current - 1)}>Back</button>
          ) : (
            <button className="btn btn-soft" type="button" onClick={onSkip}>Use defaults</button>
          )}
          {step < totalSteps - 1 ? (
            <button className="btn btn-primary" type="button" onClick={() => setStep((current) => current + 1)}>Next</button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={finish}>Save setup</button>
          )}
        </div>
        {allowDismiss && <button className="text-link onboarding-dismiss" type="button" onClick={onDismiss}>Close</button>}
      </article>
    </div>
  );
}

function DashboardReviewCard({ items, dueCount, totalCount }) {
  const upcomingCount = Math.max(0, totalCount - dueCount);
  return (
    <article className={`panel dashboard-review-card ${dueCount ? "urgent" : ""}`}>
      <div className="panel-title">
        <div>
          <p className="eyebrow">Review Queue</p>
          <h2>{dueCount ? `${dueCount} due now` : `${upcomingCount} scheduled`}</h2>
        </div>
        <span><Icon name="target" size={16} /></span>
      </div>
      <div className="review-pulse-row">
        <div><strong>{totalCount}</strong><span>active</span></div>
        <div><strong>{dueCount}</strong><span>due</span></div>
        <div><strong>{upcomingCount}</strong><span>upcoming</span></div>
      </div>
      <div className="dashboard-review-list">
        {items.length ? items.slice(0, 3).map((item) => (
          <div key={item.id} className="dashboard-review-item">
            <span>{item.reason || "Spaced review"}</span>
            <small>{relativeTime(item.due_at)}</small>
          </div>
        )) : <p>No active review items. New weak answers will appear here.</p>}
      </div>
      <Link className={dueCount ? "btn btn-primary" : "btn btn-soft"} to="/review">{dueCount ? "Start review" : "Open review"}</Link>
    </article>
  );
}

function LevelCard({ xp }) {
  const level = xp?.level || 1;
  const progress = xp?.progress || 0;
  const remaining = xp?.remaining || 0;
  return (
    <article className="panel level-card">
      <div className="level-badge">
        <span>LVL</span>
        <strong>{level}</strong>
      </div>
      <div>
        <p className="eyebrow">XP Level</p>
        <h2>{xp?.title || "Dental Starter"}</h2>
        <ProgressLine value={progress} />
        <div className="progress-meta"><span>{xp?.total || 0} XP earned</span><strong>{remaining} XP to next</strong></div>
      </div>
    </article>
  );
}



function FocusTimerCard() {
  const [duration, setDuration] = useState(readFocusDurationPreference);
  const [secondsLeft, setSecondsLeft] = useState(duration * 60);
  const [running, setRunning] = useState(false);
  const complete = secondsLeft === 0;
  const progress = Math.round(((duration * 60 - secondsLeft) / (duration * 60)) * 100);

  useEffect(() => {
    localStorage.setItem("dentify.focus.minutes", String(duration));
  }, [duration]);

  useEffect(() => {
    if (!running || complete) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, complete]);

  useEffect(() => {
    if (complete) setRunning(false);
  }, [complete]);

  function chooseDuration(minutes) {
    setDuration(minutes);
    setSecondsLeft(minutes * 60);
    setRunning(false);
  }

  function resetTimer() {
    setSecondsLeft(duration * 60);
    setRunning(false);
  }

  return (
    <article className={`panel focus-timer-card ${running ? "running" : ""} ${complete ? "complete" : ""}`}>
      <div className="panel-title">
        <div>
          <p className="eyebrow">Focus Timer</p>
          <h2>{complete ? "Block complete" : "Deep study block"}</h2>
        </div>
        <span><Icon name="clock" size={16} /></span>
      </div>
      <div className="focus-timer-face" style={{ "--timer-progress": `${progress}%` }}>
        <strong>{formatDuration(secondsLeft)}</strong>
        <span>{duration} min block</span>
      </div>
      <div className="focus-duration-options" aria-label="Focus timer duration">
        {focusDurations.map((item) => (
          <button key={item.minutes} className={duration === item.minutes ? "active" : ""} onClick={() => chooseDuration(item.minutes)} type="button" aria-pressed={duration === item.minutes}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="focus-timer-actions">
        <button className="btn btn-primary" onClick={() => setRunning((value) => !value)} disabled={complete}>
          {running ? "Pause" : "Start"}
        </button>
        <button className="btn btn-soft" onClick={resetTimer}>Reset</button>
      </div>
    </article>
  );
}

function DashboardHero({ insight, character, theme }) {
  const heroSrc = themePreview(character, theme);
  const characterLabel = character === "white" ? "white cat" : "black cat";
  if (!insight) {
    return (
      <article className="scene-card" aria-label="Dentify mascot scene">
        <img className="scene-theme" src={heroSrc} alt={`Dentify ${characterLabel} studying in the ${theme} theme`} />
      </article>
    );
  }
  return (
    <article className="scene-card" aria-label="Dentify mascot scene">
      <img className="scene-theme" src={heroSrc} alt={`Dentify ${characterLabel} studying in the ${theme} theme`} />
      <div className="scene-wall-quote">
        <span>"</span>
        <div>
          <strong>{insight.title}</strong>
          <p>{insight.body}</p>
          {insight.actionLabel && (
            <Link to={insight.actionPath || "/questions"}>{insight.actionLabel}</Link>
          )}
        </div>
      </div>
    </article>
  );
}

function StudyTable({ initialItems }) {
  const [items, setItems] = useState(initialItems || []);
  const [form, setForm] = useState({ time: "", topic: "" });
  const [formError, setFormError] = useState("");
  const [addingPlan, setAddingPlan] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ time: "", topic: "" });
  const [savingId, setSavingId] = useState(null);

  async function addItem(event) {
    event.preventDefault();
    setFormError("");
    if (!form.time || !form.topic.trim()) {
      setFormError(!form.time ? "Please add a study time." : "Please add a study topic.");
      return;
    }
    setAddingPlan(true);
    try {
      const created = await api("/api/study-plan", { method: "POST", body: JSON.stringify({ time: form.time, topic: form.topic.trim() }) });
      setItems((current) => [...current, created].sort((a, b) => a.time.localeCompare(b.time)));
      setForm({ time: "", topic: "" });
    } catch (error) {
      setFormError(error.message || "Could not add this study block.");
    } finally {
      setAddingPlan(false);
    }
  }

  function startEdit(item) {
    setFormError("");
    setEditingId(item.id);
    setEditForm({ time: item.time, topic: item.topic });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ time: "", topic: "" });
  }

  async function saveItem(id) {
    setFormError("");
    if (!editForm.time || !editForm.topic.trim()) {
      setFormError(!editForm.time ? "Please add a study time before saving." : "Please add a study topic before saving.");
      return;
    }
    setSavingId(id);
    try {
      const updated = await api(`/api/study-plan/${id}`, { method: "PUT", body: JSON.stringify({ time: editForm.time, topic: editForm.topic.trim() }) });
      setItems((current) => current.map((item) => (item.id === id ? updated : item)).sort((a, b) => a.time.localeCompare(b.time)));
      cancelEdit();
    } catch (error) {
      setFormError(error.message || "Could not save this study block.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteItem(id) {
    setFormError("");
    setSavingId(id);
    try {
      await api(`/api/study-plan/${id}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) cancelEdit();
    } catch (error) {
      setFormError(error.message || "Could not delete this study block.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <article className="panel study-table-card">
      <div className="panel-title"><h2>My Study Table</h2><span>{items.length} blocks</span></div>
      <form className="plan-form" onSubmit={addItem}>
        <input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} aria-label="Study time" disabled={addingPlan} />
        <input type="text" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} placeholder="Add topic" aria-label="Study topic" disabled={addingPlan} />
        <button className="icon-btn" type="submit" disabled={addingPlan} aria-label={addingPlan ? "Adding study item" : "Add study item"}>
          <Icon name={addingPlan ? "clock" : "plus"} />
        </button>
      </form>
      {formError && <p className="inline-error" role="alert">{formError}</p>}
      <div className="plan-list">
        {items.length ? items.map((item) => {
          const editing = editingId === item.id;
          return (
            <div className={`plan-row ${editing ? "editing" : ""}`} key={item.id}>
              {editing ? (
                <>
                  <input type="time" value={editForm.time} onChange={(event) => setEditForm({ ...editForm, time: event.target.value })} aria-label={`Edit time for ${item.topic}`} />
                  <input type="text" value={editForm.topic} onChange={(event) => setEditForm({ ...editForm, topic: event.target.value })} aria-label={`Edit topic for ${item.topic}`} />
                  <div className="plan-row-actions">
                    <button type="button" onClick={() => saveItem(item.id)} disabled={savingId === item.id} aria-label={`Save ${item.topic}`}><Icon name="save" size={17} /></button>
                    <button type="button" onClick={cancelEdit} disabled={savingId === item.id} aria-label="Cancel edit"><Icon name="reset" size={17} /></button>
                  </div>
                </>
              ) : (
                <>
                  <strong>{item.time}</strong>
                  <span>{item.topic}</span>
                  <div className="plan-row-actions">
                    <button type="button" onClick={() => startEdit(item)} disabled={savingId === item.id} aria-label={`Edit ${item.topic}`}><Icon name="pencil" size={17} /></button>
                    <button type="button" onClick={() => deleteItem(item.id)} disabled={savingId === item.id} aria-label={`Delete ${item.topic}`}><Icon name="x" size={17} /></button>
                  </div>
                </>
              )}
            </div>
          );
        }) : <EmptyState title="No study blocks yet" text="Add your first time and topic to shape today's study rhythm." />}
      </div>
    </article>
  );
}
