import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { Page, LoadingPanel, ErrorPanel, ProgressLine, MiniFeature } from "../components/ui/index.jsx";
import { StatsGrid } from "../components/shared/StatsGrid.jsx";
import { MaterialCard } from "./Materials.jsx";
import { StudyHeatmap, ChartPanel, DifficultyPanel } from "./Analytics.jsx";


export default function Progress() {
  const { loading, error, data } = useAsyncData(() => api("/api/progress"), []);
  const [tab, setTab] = useState("overview");
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  const topMaterial = [...data.materials].sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];
  const weakestMaterial = [...data.materials].sort((a, b) => (a.accuracy || 0) - (b.accuracy || 0))[0];
  const attemptedMaterials = data.materials.filter((material) => material.attempts > 0).length;
  const recentSolved = (data.solvedByDay || []).reduce((total, day) => total + Number(day.count || 0), 0);
  const tabs = [
    ["overview", "Overview"],
    ["materials", "Materials"],
    ["trends", "Trends"]
  ];
  return (
    <Page title="Progress" subtitle="Your study progress converted into readable signals.">
      <section className="progress-hero">
        <div>
          <p className="eyebrow">My Progress</p>
          <h2>{data.stats.accuracy}% accuracy · Level {data.stats.xp?.level || 1}</h2>
          <p>{data.stats.questionsSolved} solved questions, {data.stats.dueReviewCount || 0} due reviews, and {data.stats.dailyGoal?.remaining || 0} questions left today.</p>
        </div>
        <div className="progress-hero-meter" style={{ "--progress-xp": `${data.stats.xp?.progress || 0}%` }}>
          <span>XP</span>
          <strong>{data.stats.xp?.progress || 0}%</strong>
          <small>{data.stats.xp?.remaining || 0} XP to next level</small>
        </div>
      </section>
      <div className="progress-tabs" role="tablist" aria-label="Progress sections">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`progress-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`progress-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <div id="progress-panel-overview" role="tabpanel" aria-labelledby="progress-tab-overview">
          <section className="progress-insight-grid">
            <MiniFeature title="Best material" text={topMaterial ? `${topMaterial.title} is at ${topMaterial.progress}% completion.` : "Start a material to build a lead."} icon="award" />
            <MiniFeature title="Needs attention" text={weakestMaterial ? `${weakestMaterial.title} accuracy is ${weakestMaterial.accuracy || 0}%.` : "Accuracy appears after attempts."} icon="target" />
            <MiniFeature title="Coverage" text={`${attemptedMaterials}/${data.materials.length} materials have practice attempts.`} icon="layers" />
          </section>
          <StatsGrid stats={data.stats} />
        </div>
      )}
      {tab === "materials" && (
        <div id="progress-panel-materials" role="tabpanel" aria-labelledby="progress-tab-materials">
          <section className="material-grid progress-materials">
            {data.materials.map((material) => <MaterialCard key={material.id} material={material} />)}
          </section>
        </div>
      )}
      {tab === "trends" && (
        <div id="progress-panel-trends" role="tabpanel" aria-labelledby="progress-tab-trends">
          <section className="progress-trends-grid">
            <StudyHeatmap solvedByDay={data.solvedByDay || []} />
            <ChartPanel title="Material completion" rows={data.materials.map((item) => [item.title, item.progress])} />
            <ChartPanel title="Material accuracy" rows={data.materials.map((item) => [item.title, item.accuracy || 0])} />
            <DifficultyPanel rows={data.difficulty || []} />
            <article className="panel progress-summary-panel">
              <div className="panel-title"><h2>Last 28 days</h2><span><Icon name="calendar" size={16} /></span></div>
              <strong>{recentSolved}</strong>
              <p>questions solved across the visible study calendar.</p>
            </article>
          </section>
        </div>
      )}
    </Page>
  );
}
