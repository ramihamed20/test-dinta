import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { Page, LoadingPanel, ErrorPanel, MiniFeature } from "../components/ui/index.jsx";

export default function Progress() {
  const { loading, error, data } = useAsyncData(() => api("/api/progress"), []);
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;

  const topMaterial = [...data.materials].sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];
  const weakestMaterial = [...data.materials].sort((a, b) => (a.accuracy || 0) - (b.accuracy || 0))[0];
  const attemptedMaterials = data.materials.filter((material) => material.attempts > 0).length;

  return (
    <Page title="Progress" subtitle="Your study progress converted into readable signals.">
      <section className="progress-hero">
        <div className="progress-hero-main">
          <p className="eyebrow">My Progress</p>
          <div className="progress-hero-level-badge">
            <span className="level-label">Level</span>
            <span className="level-number">{data.stats.xp?.level || 1}</span>
          </div>
        </div>
        <div className="progress-hero-meter" style={{ "--progress-xp": `${data.stats.xp?.progress || 0}%` }}>
          <span>XP Progress</span>
          <strong>{data.stats.xp?.progress || 0}%</strong>
          <small>{data.stats.xp?.remaining || 0} XP to next level</small>
        </div>
      </section>

      <section className="progress-insight-grid">
        <MiniFeature title="Best material" text={topMaterial ? `${topMaterial.title} is at ${topMaterial.progress}% completion.` : "Start a material to build a lead."} icon="award" />
        <MiniFeature title="Needs attention" text={weakestMaterial ? `${weakestMaterial.title} accuracy is ${weakestMaterial.accuracy || 0}%.` : "Accuracy appears after attempts."} icon="target" />
        <MiniFeature title="Coverage" text={`${attemptedMaterials}/${data.materials.length} materials have practice attempts.`} icon="layers" />
      </section>
    </Page>
  );
}
