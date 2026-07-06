import { assets } from "../lib/constants.js";
import { assetPath } from "../lib/utils.js";
import { Page } from "../components/ui/index.jsx";

export default function Profile({ user }) {
  return (
    <Page title="My Profile" subtitle="Private student profile for the Dentify study workspace.">
      <section className="profile-grid">
        <article className="panel profile-card"><img src={assetPath(assets.mascot)} alt="Student avatar" /><h2>{user.name}</h2><p>{user.email}</p><span>{user.year}</span></article>
        <article className="panel"><h2>Study identity</h2><p className="muted">Focused dental student, building calm recall one session at a time.</p><div className="badge-row"><span>Consistent</span><span>Reviewer</span><span>Future dentist</span></div></article>
      </section>
    </Page>
  );
}
