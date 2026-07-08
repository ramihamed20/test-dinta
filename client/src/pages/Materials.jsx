import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { Page, LoadingPanel, ErrorPanel, ProgressLine } from "../components/ui/index.jsx";

export default function Materials() {
  const { loading, error, data } = useAsyncData(() => api("/api/materials"), []);
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <Page title="Materials" subtitle="Seven study areas with progress, questions, and focused review.">
      <section className="material-grid">
        {data.map((material) => <MaterialCard key={material.id} material={material} />)}
      </section>
    </Page>
  );
}

export function MaterialCard({ material }) {
  return (
    <article className="material-card">
      <div className="card-head">
        <div><h2>{material.title}</h2><p>{material.description}</p></div>
        <span className="stat-icon"><Icon name={material.icon} /></span>
      </div>
      <ProgressLine value={material.progress} />
      <div className="progress-meta"><span>{material.questionCount} questions</span><strong>{material.progress}%</strong></div>
      <Link className="btn btn-soft" to={`/materials/${material.id}`}>Open sheets</Link>
    </article>
  );
}

export function MaterialSheets() {
  const { materialId } = useParams();
  const { loading, error, data } = useAsyncData(() => api(`/api/materials/${materialId}/sheets`), [materialId]);
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <Page title={data.material.title} subtitle="Choose a sheet, then select Normal Study or Advanced Study before opening it.">
      <section className="sheet-grid">
        {data.sheets.map((sheet) => (
          <article className="sheet-card" key={sheet.id}>
            <div className="card-head">
              <div><span className="pill">{sheet.totalPages} pages</span><h2>{sheet.title}</h2><p>{sheet.summary}</p></div>
              <span className="stat-icon"><Icon name={sheet.mastered ? "check" : "file"} /></span>
            </div>
            <ProgressLine value={Math.min(100, sheet.bestAverage || 0)} />
            <div className="progress-meta"><span>{sheet.masteryStatus}</span><strong>{sheet.bestAverage || 0}%</strong></div>
            <Link className="btn btn-primary" to={`/materials/${materialId}/sheets/${sheet.id}`}>Open sheet</Link>
          </article>
        ))}
      </section>
    </Page>
  );
}
