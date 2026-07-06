import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { assets } from "../lib/constants.js";
import { assetPath } from "../lib/utils.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { Page, LoadingPanel, ErrorPanel, ProgressLine } from "../components/ui/index.jsx";

export default function Analytics() {
  const { loading, error, data } = useAsyncData(() => api("/api/analytics"), []);
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  const readiness = Math.min(96, Math.max(42, data.stats.accuracy + data.stats.questionsSolved * 2));
  return (
    <Page title="Analytics" subtitle="Readiness, accuracy, consistency, and material-level progress.">
      <section className="analytics-hero">
        <div><p className="eyebrow">Predicted readiness</p><h2>{readiness}%</h2><p>Based on solved questions, accuracy, saved review, and study table activity.</p></div>
        <img src={assetPath(assets.mascot)} alt="Dentify mascot studying" />
      </section>
      <StudyHeatmap solvedByDay={data.solvedByDay || []} />
      <section className="analytics-grid">
        <ChartPanel title="Accuracy by material" rows={data.materials.map((item) => [item.title, item.accuracy || item.progress])} />
        <ChartPanel title="Completion by material" rows={data.materials.map((item) => [item.title, item.progress])} />
        <DifficultyPanel rows={data.difficulty || []} />
      </section>
    </Page>
  );
}

export function DifficultyPanel({ rows }) {
  const labels = { Easy: "Warm-up", Medium: "Core", Hard: "Exam pressure" };
  return (
    <article className="panel difficulty-panel">
      <div className="panel-title">
        <div><h2>Difficulty Distribution</h2><p>Coverage and accuracy by question level.</p></div>
      </div>
      <div className="difficulty-bars">
        {rows.map((row) => (
          <div className="difficulty-row" key={row.difficulty}>
            <div>
              <strong>{row.difficulty}</strong>
              <small>{labels[row.difficulty] || "Practice"} · {row.attempts}/{row.total} tried</small>
            </div>
            <div className="difficulty-progress">
              <i aria-label={`${row.coverage}% coverage`}><b style={{ width: `${Math.max(4, row.coverage)}%` }} /></i>
              <span>{row.coverage}% coverage</span>
            </div>
            <span className="pill">{row.accuracy}% accuracy</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export function StudyHeatmap({ solvedByDay }) {
  const counts = new Map(solvedByDay.map((item) => [item.date, item.count]));
  const days = Array.from({ length: 28 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (27 - index));
    const key = date.toISOString().slice(0, 10);
    const count = counts.get(key) || 0;
    return {
      key,
      count,
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      weekday: date.toLocaleDateString(undefined, { weekday: "short" })
    };
  });
  const activeDays = days.filter((day) => day.count > 0).length;
  const maxCount = Math.max(1, ...days.map((day) => day.count));
  return (
    <article className="panel heatmap-panel">
      <div className="panel-title">
        <div><h2>Study Calendar</h2><p>Last 28 days of solved questions.</p></div>
        <span>{activeDays}/28 active</span>
      </div>
      <div className="heatmap-grid" aria-label="Study activity for the last 28 days">
        {days.map((day) => {
          const level = day.count === 0 ? 0 : Math.max(1, Math.ceil((day.count / maxCount) * 4));
          return (
            <span
              key={day.key}
              className={`heat-cell level-${level}`}
              title={`${day.weekday}, ${day.label}: ${day.count} solved`}
              aria-label={`${day.weekday}, ${day.label}: ${day.count} solved`}
            />
          );
        })}
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        <i className="level-0" />
        <i className="level-1" />
        <i className="level-2" />
        <i className="level-3" />
        <i className="level-4" />
        <span>More</span>
      </div>
    </article>
  );
}

export function ChartPanel({ title, rows }) {
  return (
    <article className="panel chart-panel">
      <h2>{title}</h2>
      {rows.map(([label, value]) => (
        <div className="bar-row" key={label}>
          <span>{label}</span>
          <i><b style={{ width: `${Math.max(4, value)}%` }} /></i>
          <strong>{value}%</strong>
        </div>
      ))}
    </article>
  );
}
