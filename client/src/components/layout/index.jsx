import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "../../lib/icons.jsx";
import { navItems, themeOptions } from "../../lib/constants.js";
import { assets } from "../../lib/constants.js";
import { assetPath, greeting, readStreakProtection, streakProtectionKey, weekStamp } from "../../lib/utils.js";

// --- Brand ---

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <img src={assetPath("/assets/logo.jpg")} alt="Dentify Logo" className="brand-logo-img" />
      </span>
      <strong>Dentify</strong>
    </div>
  );
}

// --- NavList ---

export function NavList({ tabIndex, onNavigate } = {}) {
  const location = useLocation();
  let currentGroup = "";
  return (
    <nav className="nav-list" aria-label="Primary">
      {navItems.map((item) => {
        const showGroup = item.group !== currentGroup;
        currentGroup = item.group;
        const active = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
        return (
          <div className="nav-entry" key={item.path}>
            {showGroup && <span className="nav-section-label">{item.group}</span>}
            <Link to={item.path} className={`nav-btn ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} tabIndex={tabIndex} onClick={onNavigate}>
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

// --- DrawerThemeSelector ---

export function DrawerThemeSelector({ activeTheme, onThemeChange, tabIndex }) {
  return (
    <section className="drawer-theme-selector" aria-label="Theme selector">
      <div>
        <p className="nav-section-label">Theme</p>
        <strong>{themeOptions.find((item) => item.id === activeTheme)?.label || "Theme"}</strong>
      </div>
      <div className="drawer-theme-options">
        {themeOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={activeTheme === option.id ? "active" : ""}
            onClick={() => onThemeChange(option.id)}
            aria-pressed={activeTheme === option.id}
            aria-label={`Use ${option.label} theme`}
            tabIndex={tabIndex}
          >
            <span aria-hidden="true" />
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

// --- StreakCard ---

export function StreakCard({ user }) {
  const [protection, setProtection] = useState(() => readStreakProtection(user?.email));
  const currentWeek = weekStamp();
  const freezeAvailable = protection.usedWeek !== currentWeek;

  useEffect(() => {
    setProtection(readStreakProtection(user?.email));
  }, [user?.email]);

  useEffect(() => {
    localStorage.setItem(streakProtectionKey(user?.email), JSON.stringify(protection));
  }, [user?.email, protection]);

  function useFreeze() {
    setProtection({ usedWeek: currentWeek });
  }

  return (
    <div className={`streak-card ${freezeAvailable ? "" : "protected"}`}>
      <div><Icon name="activity" size={18} /> Keep going!</div>
      <p>14 day streak</p>
      <span><i style={{ width: "72%" }} /></span>
      <div className="streak-freeze-row">
        <small>{freezeAvailable ? "1 freeze available" : "Freeze used this week"}</small>
        <button type="button" onClick={useFreeze} disabled={!freezeAvailable}>{freezeAvailable ? "Use" : "Protected"}</button>
      </div>
    </div>
  );
}

// --- Sidebar ---

export function Sidebar({ user }) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <Brand />
      <NavList />
      <StreakCard user={user} />
    </aside>
  );
}

// --- BottomNav ---

export function BottomNav() {
  const location = useLocation();
  const items = navItems.filter((item) => ["/", "/materials", "/questions", "/review", "/bookmarks"].includes(item.path));
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {items.map((item) => {
        const active = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
        return (
          <Link key={item.path} to={item.path} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// --- Topbar ---

export function Topbar({ user, theme, onThemeChange, onLogout, onMenu, menuOpen, menuButtonRef }) {
  const [open, setOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, menuOpen]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function logoutFromMenu() {
    setOpen(false);
    onLogout();
  }

  return (
    <header className="topbar">
      <button className="icon-btn mobile-menu" ref={menuButtonRef} onClick={onMenu} aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="mobile-drawer">
        <Icon name="menu" />
      </button>
      <div className="page-title">
        <h1>{greeting()}, future dentist!</h1>
        <p>Let's continue your journey.</p>
      </div>
      <label className="search-box">
        <Icon name="search" size={18} />
        <input type="search" placeholder="Search Dentify" aria-label="Search Dentify" />
      </label>
      <button className="icon-btn" onClick={() => onThemeChange(theme === "night" ? "day" : "night")} aria-label="Toggle theme">
        <Icon name={theme === "night" ? "sun" : "moon"} />
      </button>
      <button className="icon-btn" aria-label="Notifications">
        <Icon name="bell" />
        <span className="dot" />
      </button>
      <div className="profile-menu-wrap" ref={profileMenuRef}>
        <button className="avatar-btn" onClick={() => setOpen(!open)} aria-label="Open profile menu" aria-expanded={open} aria-controls="profile-menu">
          <img src={assetPath(assets.mascot)} alt="Student avatar" />
        </button>
        {open && (
          <div className="profile-menu" id="profile-menu" role="menu" aria-label="Profile menu">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
            <Link to="/profile" role="menuitem" onClick={() => setOpen(false)}><Icon name="user" size={17} /> My Profile</Link>
            <Link to="/achievements" role="menuitem" onClick={() => setOpen(false)}><Icon name="award" size={17} /> Achievements</Link>
            <Link to="/settings" role="menuitem" onClick={() => setOpen(false)}><Icon name="settings" size={17} /> Settings</Link>
            <button role="menuitem" onClick={logoutFromMenu}><Icon name="logout" size={17} /> Logout</button>
          </div>
        )}
      </div>
    </header>
  );
}

// --- Shell ---

export function Shell({ children, user, theme, onThemeChange, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const drawerCloseRef = useRef(null);
  const drawerTriggerRef = useRef(null);
  const drawerTabIndex = drawerOpen ? undefined : -1;
  const location = useLocation();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    window.setTimeout(() => drawerCloseRef.current?.focus(), 0);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
      if (event.key === "Tab") {
        const focusable = Array.from(
          drawerRef.current?.querySelectorAll("a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])") || []
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => drawerTriggerRef.current?.focus(), 0);
    };
  }, [drawerOpen]);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="app-shell">
        <Sidebar user={user} />
        <div className="content-frame">
          <Topbar
            user={user}
            theme={theme}
            onThemeChange={onThemeChange}
            onLogout={onLogout}
            onMenu={() => setDrawerOpen(true)}
            menuOpen={drawerOpen}
            menuButtonRef={drawerTriggerRef}
          />
          <main className="page-shell" id="main-content" tabIndex={-1} aria-label="Dentify page content">{children}</main>
        </div>
        <BottomNav />
        <div className={`drawer-backdrop ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} />
        <aside className={`mobile-drawer ${drawerOpen ? "open" : ""}`} id="mobile-drawer" ref={drawerRef} aria-label="Mobile navigation" aria-hidden={drawerOpen ? undefined : "true"} aria-modal={drawerOpen ? "true" : undefined} role="dialog">
          <div className="drawer-head">
            <Brand />
            <button className="icon-btn" ref={drawerCloseRef} onClick={() => setDrawerOpen(false)} aria-label="Close navigation" tabIndex={drawerTabIndex}>
              <Icon name="x" />
            </button>
          </div>
          <DrawerThemeSelector activeTheme={theme} onThemeChange={onThemeChange} tabIndex={drawerTabIndex} />
          <NavList tabIndex={drawerTabIndex} onNavigate={() => setDrawerOpen(false)} />
        </aside>
      </div>
    </>
  );
}
