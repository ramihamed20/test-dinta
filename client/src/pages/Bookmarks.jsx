import { useState } from "react";
import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { Page, LoadingPanel, ErrorPanel, ListRow, EmptyState } from "../components/ui/index.jsx";
import { ConfirmDialog } from "../components/shared/ConfirmDialog.jsx";

export default function Bookmarks() {
  const [refresh, setRefresh] = useState(0);
  const { loading, error, data } = useAsyncData(() => api("/api/bookmarks"), [refresh]);
  const [confirmItem, setConfirmItem] = useState(null);

  async function removeBookmark(item) {
    await api(`/api/bookmarks/${item.id}`, { method: "DELETE" });
    setConfirmItem(null);
    setRefresh((value) => value + 1);
  }

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  return (
    <Page title="Bookmarks" subtitle="Saved questions and materials for later review.">
      <section className="list-panel">
        {data.length ? data.map((item) => (
          <ListRow
            key={item.id}
            title={item.title || `${item.type} #${item.target_id}`}
            meta={item.meta || "Saved for focused study"}
            icon="bookmark"
            action={<button className="btn btn-danger compact" onClick={() => setConfirmItem(item)} aria-label={`Remove ${item.title || item.type}`}><Icon name="x" size={17} /> Remove</button>}
          />
        )) : <EmptyState title="Nothing saved yet" text="Use the bookmark button inside Questions to save important items." />}
      </section>
      <ConfirmDialog
        open={!!confirmItem}
        title="Remove bookmark?"
        message={`Remove "${confirmItem?.title || "this item"}" from your saved list?`}
        confirmLabel="Remove"
        onConfirm={() => removeBookmark(confirmItem)}
        onCancel={() => setConfirmItem(null)}
      />
    </Page>
  );
}

