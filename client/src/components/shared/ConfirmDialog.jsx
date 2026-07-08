import { useRef, useEffect } from "react";
import { Icon } from "../../lib/icons.jsx";

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    if (open) {
      ref.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-dialog" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-desc" onClick={(e) => e.stopPropagation()} ref={ref} tabIndex={-1}>
        <div className="confirm-icon">
          <Icon name="help" size={24} />
        </div>
        <h3 id="confirm-title">{title || "Are you sure?"}</h3>
        <p id="confirm-desc">{message || "This action cannot be undone."}</p>
        <div className="confirm-actions">
          <button className="btn btn-soft" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
