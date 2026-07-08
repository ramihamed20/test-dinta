import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { relativeTime } from "../lib/utils.js";
import { useAsyncData } from "../hooks/useAsyncData.js";
import { Page, LoadingPanel, ErrorPanel, MiniFeature } from "../components/ui/index.jsx";

export default function Community() {
  const [refresh, setRefresh] = useState(0);
  const [composer, setComposer] = useState({ body: "", tag: "Question" });
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const { loading, error, data } = useAsyncData(() => api("/api/community"), [refresh]);

  async function submitPost(event) {
    event.preventDefault();
    setPostError("");
    setPosting(true);
    try {
      await api("/api/community/posts", { method: "POST", body: JSON.stringify(composer) });
      setComposer({ body: "", tag: "Question" });
      setRefresh((value) => value + 1);
    } catch (err) {
      setPostError(err.message);
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <Page title="Community" subtitle="Announcements, student posts, discussions, and urgent alerts.">
      <section className="community-top">
        <article className="panel community-composer">
          <p className="eyebrow">Student Post</p>
          <h2>Share a study note or ask your batch.</h2>
          <form className="composer-form" onSubmit={submitPost}>
            <div className="composer-controls">
              {["Question", "Resource", "Study tip"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={composer.tag === tag ? "active" : ""}
                  aria-pressed={composer.tag === tag}
                  onClick={() => setComposer({ ...composer, tag })}
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea value={composer.body} onChange={(event) => setComposer({ ...composer, body: event.target.value })} placeholder="Share a study note or ask your batch..." aria-label="Post composer" />
            {postError && <p className="form-alert error">{postError}</p>}
            <button className="btn btn-primary" type="submit" disabled={posting}>
              <Icon name="plus" size={18} /> {posting ? "Posting..." : "Post"}
            </button>
          </form>
        </article>
        <article className="panel announcement-panel">
          <div className="panel-title"><h2>Doctor Announcements</h2><span>{data.announcements.length} live</span></div>
          <div className="announcement-list">
            {data.announcements.map((item) => (
              <article className={`announcement-item ${item.tone}`} key={item.id}>
                <span className="stat-icon"><Icon name="megaphone" /></span>
                <div><h3>{item.title}</h3><p>{item.body}</p><small>{relativeTime(item.createdAt)}</small></div>
              </article>
            ))}
          </div>
        </article>
      </section>
      <section className="community-grid">
        <article className="panel community-post-list">
          <div className="panel-title"><h2>Student Posts</h2><span>{data.posts.length} posts</span></div>
          {data.posts.map((post) => <CommunityPost key={post.id} post={post} />)}
        </article>
        <aside className="community-rail">
          <StudyBuddyCard buddy={data.buddy} />
        </aside>
      </section>
    </Page>
  );
}

function StudyBuddyCard({ buddy }) {
  if (!buddy) return null;
  return (
    <article className="study-buddy-card">
      <div className="buddy-avatar">{buddy.name?.slice(0, 1) || "B"}</div>
      <div>
        <p className="eyebrow">Study Buddy</p>
        <h2>{buddy.name}</h2>
        <p>{buddy.sharedGoal}</p>
      </div>
      <div className="buddy-meta">
        <span>{buddy.label}</span>
        <span>{buddy.metric}</span>
        <span>{buddy.accuracy}% accuracy</span>
      </div>
      <Link className="btn btn-primary" to="/questions">Start shared goal</Link>
      <small>{buddy.userSignal}</small>
    </article>
  );
}

function CommunityPost({ post }) {
  return (
    <article className="community-post">
      <div className="post-avatar">{post.author?.slice(0, 1) || "D"}</div>
      <div>
        <div className="post-meta">
          <strong>{post.author}</strong>
          <span>{post.tag}</span>
          <small>{relativeTime(post.createdAt)}</small>
        </div>
        <p>{post.body}</p>
        <div className="post-actions">
          <span><Icon name="check" size={16} /> {post.likes} helpful</span>
          <span><Icon name="messages" size={16} /> {post.replies} replies</span>
        </div>
      </div>
    </article>
  );
}
