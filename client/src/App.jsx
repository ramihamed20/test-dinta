import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api, authApi, getToken, setToken } from "./lib/api.js";
import {
  autoThemeForDate,
  normalizeThemeSettings,
  normalizeReminderSettings,
  parseReminderTime,
  readLocalThemeSettings,
  readReminderSettings,
  reminderKey,
  todayStamp
} from "./lib/utils.js";
import { Shell } from "./components/layout/index.jsx";
import { AuthPage } from "./components/auth/AuthPage.jsx";
import { FullScreenState, ReminderToast } from "./components/shared/index.jsx";
import { LoadingPanel } from "./components/ui/index.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

// --- Lazy-loaded pages ---
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Materials = lazy(() => import("./pages/Materials.jsx"));
const MaterialSheets = lazy(() => import("./pages/Materials.jsx").then((m) => ({ default: m.MaterialSheets })));
const SheetStudy = lazy(() => import("./pages/SheetStudy.jsx"));
const Questions = lazy(() => import("./pages/Questions.jsx"));
const Review = lazy(() => import("./pages/Review.jsx"));
const Community = lazy(() => import("./pages/Community.jsx"));
const Ranked = lazy(() => import("./pages/Ranked.jsx"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const Bookmarks = lazy(() => import("./pages/Bookmarks.jsx"));
const Progress = lazy(() => import("./pages/Progress.jsx"));
const Achievements = lazy(() => import("./pages/Achievements.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));

function App() {
  const [themeSettings, setThemeSettings] = useState(readLocalThemeSettings);
  const [themeClock, setThemeClock] = useState(() => new Date());
  const [reminderClock, setReminderClock] = useState(() => new Date());
  const [reminderSettings, setReminderSettings] = useState(() => readReminderSettings());
  const [reminderToast, setReminderToast] = useState("");
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(getToken()));
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const activeTheme = themeSettings.autoTheme ? autoThemeForDate(themeClock) : themeSettings.theme;

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    document.documentElement.dataset.character = themeSettings.character;
    localStorage.setItem("dentify.theme", activeTheme);
    localStorage.setItem("dentify.theme.settings", JSON.stringify(themeSettings));
  }, [activeTheme, themeSettings]);

  useEffect(() => {
    if (!themeSettings.autoTheme) return undefined;
    setThemeClock(new Date());
    let timer = null;
    function start() { timer = window.setInterval(() => setThemeClock(new Date()), 60000); }
    function stop() { if (timer) { window.clearInterval(timer); timer = null; } }
    function onVisibility() { document.hidden ? stop() : start(); }
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [themeSettings.autoTheme]);

  useEffect(() => {
    setReminderSettings(readReminderSettings(user?.email));
  }, [user?.email]);

  useEffect(() => {
    localStorage.setItem(reminderKey(user?.email), JSON.stringify(reminderSettings));
  }, [user?.email, reminderSettings]);

  useEffect(() => {
    let timer = null;
    function start() { timer = window.setInterval(() => setReminderClock(new Date()), 60000); }
    function stop() { if (timer) { window.clearInterval(timer); timer = null; } }
    function onVisibility() { document.hidden ? stop() : start(); }
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  useEffect(() => {
    if (!reminderSettings.enabled) return;
    const now = reminderClock;
    const { hours, minutes } = parseReminderTime(reminderSettings.time);
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    const shouldPing = now >= target && reminderSettings.lastSentDate !== todayStamp(now);
    if (!shouldPing) return;
    const message = `Reminder: your ${reminderSettings.time} study block is ready.`;
    setReminderSettings((current) => ({ ...current, lastSentDate: todayStamp(now) }));
    setReminderToast(message);
    if (window.Notification && Notification.permission === "granted") {
      new Notification("Dentify study reminder", { body: message });
    }
  }, [reminderClock, reminderSettings]);

  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then((nextUser) => {
        setUser(nextUser);
        setThemeSettings(normalizeThemeSettings(nextUser.themeSettings));
      })
      .catch(() => setToken(""))
      .finally(() => setBooting(false));
  }, []);

  function applyAuthedUser(nextUser) {
    setUser(nextUser);
    setThemeSettings(normalizeThemeSettings(nextUser.themeSettings));
  }

  function updateThemeSettings(nextSettings) {
    setThemeSettings(normalizeThemeSettings(nextSettings));
    setUser((current) => current ? { ...current, themeSettings: normalizeThemeSettings(nextSettings) } : current);
  }

  function setManualTheme(nextTheme) {
    updateThemeSettings({ ...themeSettings, theme: nextTheme, autoTheme: false });
    api("/api/settings/theme", {
      method: "PUT",
      body: JSON.stringify({ ...themeSettings, theme: nextTheme, autoTheme: false })
    }).then(updateThemeSettings).catch(() => {});
  }

  if (booting) return <FullScreenState message="Opening your study room..." />;

  if (!user) {
    return <AuthPage onAuthed={applyAuthedUser} />;
  }

  return (
    <>
      <Shell user={user} theme={activeTheme} onThemeChange={setManualTheme} onLogout={() => { setToken(""); setUser(null); }}>
        <ErrorBoundary>
        <Suspense fallback={<LoadingPanel />}>
          <Routes>
            <Route path="/" element={<Dashboard themeSettings={themeSettings} activeTheme={activeTheme} user={user} deferredPrompt={deferredPrompt} onClearInstallPrompt={() => setDeferredPrompt(null)} />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/materials/:materialId" element={<MaterialSheets />} />
            <Route path="/materials/:materialId/sheets/:sheetId" element={<SheetStudy />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/review" element={<Review />} />
            <Route path="/community" element={<Community />} />
            <Route path="/ranked" element={<Ranked />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/profile" element={<Profile user={user} onUserUpdate={setUser} />} />
            <Route path="/settings" element={<Settings settings={themeSettings} activeTheme={activeTheme} reminderSettings={reminderSettings} onReminderSettingsChange={setReminderSettings} onSettingsChange={updateThemeSettings} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </Shell>
      {reminderToast && <ReminderToast message={reminderToast} onDismiss={() => setReminderToast("")} />}
    </>
  );
}

export default App;
