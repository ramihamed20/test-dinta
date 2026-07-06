import { useEffect, useState } from "react";
import { Icon } from "../../lib/icons.jsx";
import { authApi } from "../../lib/api.js";
import { setToken } from "../../lib/api.js";
import { assets, quotes } from "../../lib/constants.js";
import { assetPath } from "../../lib/utils.js";

export function AuthPage({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setError("");
    setMessage("");
    setShowPwd(false);
    setShowConfirm(false);
  }, [mode]);

  useEffect(() => {
    const timer = window.setInterval(() => setQuoteIdx((i) => (i + 1) % quotes.length), 6000);
    return () => window.clearInterval(timer);
  }, []);

  const copy = {
    login: ["Welcome back!", "Log in to continue your dental learning journey."],
    signup: ["Create account", "Start your Dentify learning journey today."],
    forgot: ["Reset password", "Enter your email to receive a reset link."]
  }[mode];

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (mode === "forgot") {
      setMessage("If this email exists, a reset link will be sent in the production version.");
      return;
    }
    if (mode === "signup" && form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === "signup"
          ? await authApi.register({ name: form.name, email: form.email, password: form.password, year: "3rd year" })
          : await authApi.login({ email: form.email, password: form.password });
      setToken(result.token);
      onAuthed(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`auth-page auth-${mode}`}>
      <div className="auth-bg-orbs" aria-hidden="true">
        <span className="auth-orb auth-orb-1" />
        <span className="auth-orb auth-orb-2" />
        <span className="auth-orb auth-orb-3" />
      </div>

      <section className="auth-card" aria-label="Dentify authentication">
        <aside className="auth-art" aria-label="Dentify study illustration">
          <div className="auth-art-content">
            <img src={assetPath(assets.login)} alt="Dentify illustration" className="auth-mascot-img" />
          </div>
        </aside>

        <div className="auth-panel">
          <div className="auth-panel-inner">
            <div className="auth-brand">
              <div className="auth-brand-logo">
                <span className="auth-brand-mark">
                  <img src={assetPath("/assets/logo.jpg")} alt="Dentify Logo" className="brand-logo-img" />
                </span>
              </div>
              <span className="auth-brand-badge">Study Platform</span>
            </div>

            <div className="auth-header">
              <h1 className="auth-title">{copy[0]}</h1>
              <p className="auth-subtitle">{copy[1]}</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="auth-name">Full name</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">
                      <Icon name="user" size={18} />
                    </span>
                    <input id="auth-name" type="text" placeholder="Enter your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                </div>
              )}

              <div className="auth-field-group">
                <label className="auth-field-label" htmlFor="auth-email">Email address</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </span>
                  <input id="auth-email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>

              {mode !== "forgot" && (
                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="auth-password">Password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </span>
                    <input id="auth-password" type={showPwd ? "text" : "password"} placeholder="Enter your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                    <button type="button" className="auth-input-toggle" onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? "Hide password" : "Show password"}>
                      <Icon name={showPwd ? "eye-off" : "eye"} size={17} />
                    </button>
                  </div>
                </div>
              )}

              {mode === "signup" && (
                <div className="auth-field-group">
                  <label className="auth-field-label" htmlFor="auth-confirm">Confirm password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </span>
                    <input id="auth-confirm" type={showConfirm ? "text" : "password"} placeholder="Confirm your password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
                    <button type="button" className="auth-input-toggle" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? "Hide password" : "Show password"}>
                      <Icon name={showConfirm ? "eye-off" : "eye"} size={17} />
                    </button>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <div className="auth-options-row">
                  <label className="auth-check-row">
                    <input type="checkbox" defaultChecked />
                    <span>Remember me</span>
                  </label>
                  <button className="auth-forgot-link" type="button" onClick={() => setMode("forgot")}>
                    Forgot password?
                  </button>
                </div>
              )}

              {error && <p className="form-alert error">{error}</p>}
              {message && <p className="form-alert success">{message}</p>}

              <button className="auth-submit-btn" type="submit" disabled={loading}>
                {loading && <span className="auth-spinner" aria-hidden="true" />}
                {loading ? "Please wait..." : mode === "signup" ? "Create Account" : mode === "forgot" ? "Send Reset Link" : "Log In"}
                {!loading && <Icon name="chevron-right" size={18} />}
              </button>

              {mode !== "forgot" && (
                <button className="auth-demo-btn" type="button" onClick={() => setForm({ ...form, email: "demo@dentify.local", password: "dentify123" })}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  Use demo account
                </button>
              )}
            </form>

            <div className="auth-switch">
              {mode === "signup" && (
                <p>Already have an account? <button className="auth-switch-link" onClick={() => setMode("login")}>Log in</button></p>
              )}
              {mode === "forgot" && (
                <p><button className="auth-switch-link" onClick={() => setMode("login")}><Icon name="chevron-left" size={16} /> Back to login</button></p>
              )}
              {mode === "login" && (
                <p>Don't have an account? <button className="auth-switch-link" onClick={() => setMode("signup")}>Sign up free</button></p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
