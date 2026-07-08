import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { Page, LoadingPanel, ErrorPanel, MiniFeature } from "../components/ui/index.jsx";

export default function Ranked() {
  const { loading, error, data } = useAsyncData(() => api("/api/ranked"), []);
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <Page title="Ranked" subtitle="Weekly, monthly, batch, material, and solver leaderboards.">
      <section className="ranked-hero">
        <div>
          <p className="eyebrow">Weekly Champion</p>
          <h2>{data.featured?.name || "Lina A."}</h2>
          <p>{data.featured?.metric || "186 solved"} with {data.featured?.accuracy || 94}% accuracy.</p>
          <span className="pill success"><Icon name="trophy" size={16} /> 1st place</span>
        </div>
        <div className="rank-user-card">
          <span>Your Rank</span>
          <strong>#{data.currentUser.rank}</strong>
          <p>{data.currentUser.percentile} - {data.currentUser.points.toLocaleString()} pts</p>
        </div>
      </section>
      <section className="leaderboard-grid">
        <Leaderboard title="Batch Ranking" entries={data.groups.weekly || []} icon="trophy" />
        <Leaderboard title="Top Solvers" entries={data.groups.solver || []} icon="medal" />
        <Leaderboard title="Monthly Board" entries={data.groups.monthly || []} icon="award" />
        <Leaderboard title="Material Ranking" entries={data.groups.material || []} icon="analytics" />
      </section>
    </Page>
  );
}

function Leaderboard({ title, entries, icon }) {
  return (
    <article className="panel leaderboard-card">
      <div className="panel-title"><h2>{title}</h2><span><Icon name={icon} size={16} /></span></div>
      <div className="rank-list">
        {entries.map((entry) => (
          <div className="rank-row" key={`${title}-${entry.rank}-${entry.name}`}>
            <span className="rank-place">{entry.rank}</span>
            <div><strong>{entry.name}</strong><small>{entry.label}</small></div>
            <p>{entry.metric}<b>{entry.accuracy}%</b></p>
          </div>
        ))}
      </div>
    </article>
  );
}
