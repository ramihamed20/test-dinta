import { useState } from "react";
import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { assets } from "../lib/constants.js";
import { assetPath } from "../lib/utils.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { Page, LoadingPanel, ErrorPanel, ProgressLine } from "../components/ui/index.jsx";

export default function Profile({ user, onUserUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", year: user?.year || "3rd Year" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { data: stats } = useAsyncData(() => api("/api/dashboard"), []);

  const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Intern", "Graduate"];

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify(form)
      });
      if (onUserUpdate) onUserUpdate({ ...user, ...updated });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (passwordForm.next.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }
    try {
      await api("/api/profile/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.next })
      });
      setPasswordSuccess("Password updated successfully.");
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPasswordError(err.message);
    }
  }

  const xp = stats?.stats?.xp || { level: 1, title: "Dental Starter", total: 0, progress: 0 };

  return (
    <Page title="My Profile" subtitle="Manage your identity, study stats, and account settings.">
      <section className="profile-grid">
        <article className="panel profile-card">
          <div className="profile-avatar-wrap">
            <img src={assetPath(assets.mascot)} alt="Student avatar" />
            <div className="profile-level-badge">
              <span>LVL</span>
              <strong>{xp.level}</strong>
            </div>
          </div>
          {editing ? (
            <form onSubmit={saveProfile} className="profile-edit-form">
              <label className="field">
                <span>Display Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  minLength={2}
                />
              </label>
              <label className="field">
                <span>Academic Year</span>
                <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              {error && <p className="form-alert error">{error}</p>}
              <div className="profile-edit-actions">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button className="btn btn-soft" type="button" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <span className="pill">{user.year || "3rd Year"}</span>
              <button className="btn btn-soft" onClick={() => setEditing(true)}>
                <Icon name="settings" size={16} /> Edit profile
              </button>
            </>
          )}
        </article>

        <article className="panel profile-stats-panel">
          <h2>Study Overview</h2>
          <div className="profile-xp-card">
            <div>
              <p className="eyebrow">Level {xp.level}</p>
              <strong>{xp.title}</strong>
            </div>
            <div className="profile-xp-bar">
              <ProgressLine value={xp.progress} />
              <small>{xp.total} XP total</small>
            </div>
          </div>
          <div className="profile-identity">
            <p className="eyebrow">Study Identity</p>
            <p>Focused dental student, building calm recall one session at a time.</p>
            <div className="badge-row">
              <span>Consistent</span>
              <span>Reviewer</span>
              <span>Future Dentist</span>
            </div>
          </div>
        </article>

        <article className="panel profile-security-panel">
          <h2>Change Password</h2>
          <form onSubmit={changePassword} className="password-form">
            <label className="field">
              <span>Current password</span>
              <input
                type={showPassword ? "text" : "password"}
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                type={showPassword ? "text" : "password"}
                value={passwordForm.next}
                onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                required
                minLength={6}
              />
              {passwordForm.next.length > 0 && passwordForm.next.length < 6 && (
                <small className="form-hint danger">Must be at least 6 characters</small>
              )}
              {passwordForm.next.length >= 6 && (
                <small className="form-hint success">
                  <Icon name="check" size={12} /> Strong enough
                </small>
              )}
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <input
                type={showPassword ? "text" : "password"}
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                required
              />
            </label>
            <label className="show-password-label">
              <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} />
              Show passwords
            </label>
            {passwordError && <p className="form-alert error">{passwordError}</p>}
            {passwordSuccess && <p className="form-alert success">{passwordSuccess}</p>}
            <button className="btn btn-soft" type="submit">
              <Icon name="lock" size={16} /> Update password
            </button>
          </form>
        </article>
      </section>
    </Page>
  );
}
