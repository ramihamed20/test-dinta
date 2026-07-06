import { Icon } from "../../lib/icons.jsx";
import { SessionConfetti } from "../ui/index.jsx";
import { assetPath } from "../../lib/utils.js";

export function FullScreenState({ message }) {
  return (
    <main className="screen-state">
      <span className="brand-mark">
        <img src={assetPath("/assets/logo.jpg")} alt="Dentify Logo" className="brand-logo-img" />
      </span>
      <p>{message}</p>
    </main>
  );
}

export function ReminderToast({ message, onDismiss }) {
  return (
    <div className="reminder-toast" role="status" aria-live="polite">
      <span className="stat-icon"><Icon name="bell" size={16} /></span>
      <div>
        <p className="eyebrow">Study reminder</p>
        <strong>{message}</strong>
      </div>
      <button className="icon-btn" onClick={onDismiss} aria-label="Dismiss reminder"><Icon name="x" size={17} /></button>
    </div>
  );
}

export function LevelUpToast({ level, title, onDismiss }) {
  return (
    <div className="level-up-toast" role="status" aria-live="polite">
      <SessionConfetti />
      <div className="level-badge compact">
        <span>LVL</span>
        <strong>{level}</strong>
      </div>
      <div>
        <p className="eyebrow">Level up</p>
        <h2>{title}</h2>
        <p>Your XP crossed into a new Dentify level.</p>
      </div>
      <button className="icon-btn" onClick={onDismiss} aria-label="Dismiss level up notification"><Icon name="x" size={17} /></button>
    </div>
  );
}
