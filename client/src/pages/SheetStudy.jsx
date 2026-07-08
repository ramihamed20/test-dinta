import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { Icon } from "../lib/icons.jsx";
import { Page, LoadingPanel, ErrorPanel, ProgressLine } from "../components/ui/index.jsx";

export default function SheetStudy() {
  const { materialId, sheetId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [modeStep, setModeStep] = useState("choose");
  const [difficulty, setDifficulty] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [variant, setVariant] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fullscreenPdf, setFullscreenPdf] = useState(false);
  const [drawings, setDrawings] = useState({});

  async function startNormal() {
    await runAction(async () => {
      const data = await api(`/api/sheets/${sheetId}/start`, { method: "POST", body: JSON.stringify({ mode: "normal" }) });
      setSession(data);
      setModeStep("reader");
    });
  }

  async function startAdvanced(nextDifficulty) {
    await runAction(async () => {
      const data = await api(`/api/sheets/${sheetId}/start`, {
        method: "POST",
        body: JSON.stringify({ mode: "advanced", difficulty: nextDifficulty })
      });
      setDifficulty(nextDifficulty);
      setSession(data);
      setModeStep("advanced");
      setQuiz(null);
      setResult(null);
      setAnswers({});
    });
  }

  async function loadQuiz(isFinal = false, nextVariant = variant) {
    await runAction(async () => {
      const block = session.block || { pageStart: 1, pageEnd: session.sheet.totalPages };
      const data = await api(
        `/api/sheets/${sheetId}/quiz?difficulty=${difficulty}&pageStart=${block.pageStart}&pageEnd=${block.pageEnd}&variant=${nextVariant}${isFinal ? "&final=1" : ""}`
      );
      setQuiz(data);
      setResult(null);
      setAnswers({});
    });
  }

  async function submitQuiz() {
    await runAction(async () => {
      const data = await api(`/api/sheets/${sheetId}/quiz/submit`, {
        method: "POST",
        body: JSON.stringify({
          difficulty,
          pageStart: quiz.pageStart,
          pageEnd: quiz.pageEnd,
          isFinal: quiz.isFinal,
          variant: quiz.variant,
          answers: quiz.questions.map((question) => ({
            questionId: question.id,
            selectedAnswer: answers[question.id] || ""
          }))
        })
      });
      setResult(data);
      setQuiz(null);
    });
  }

  async function continueAfterReview() {
    await runAction(async () => {
      const data = await api(`/api/sheets/${sheetId}/advanced/continue`, {
        method: "POST",
        body: JSON.stringify({ difficulty, pageEnd: result.pageEnd })
      });
      setSession(data);
      setResult(null);
      setQuiz(null);
      setAnswers({});
    });
  }

  function retakeQuiz() {
    const nextVariant = variant + 1;
    setVariant(nextVariant);
    loadQuiz(result?.isFinal || false, nextVariant);
  }

  async function runAction(action) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (modeStep === "choose") {
    return (
      <Page title="Study Mode" subtitle="Select how you want to open this sheet. Advanced Study unlocks only 3 pages at a time.">
        <section className="study-mode-grid">
          <button className="study-mode-card" onClick={startNormal} disabled={busy}>
            <span className="stat-icon"><Icon name="book-open" /></span>
            <h2>Normal Study</h2>
            <p>Open the full sheet normally with no restrictions.</p>
          </button>
          <button className="study-mode-card featured" onClick={() => setModeStep("difficulty")} disabled={busy}>
            <span className="stat-icon"><Icon name="target" /></span>
            <h2>Advanced Study</h2>
            <p>Study 3 pages, pass a quiz, unlock the next 3 pages, and collect XP.</p>
          </button>
        </section>
        {error && <ErrorPanel message={error} />}
      </Page>
    );
  }

  if (modeStep === "difficulty") {
    return (
      <Page title="Advanced Study" subtitle="Choose the difficulty for this sheet. The Final Boss will use the same difficulty.">
        <section className="difficulty-grid">
          {["easy", "medium", "hard"].map((level) => (
            <button className={`difficulty-card ${level}`} key={level} onClick={() => startAdvanced(level)} disabled={busy}>
              <span>{level}</span>
              <h2>{level === "easy" ? "5 questions" : level === "medium" ? "7 questions" : "10 questions"}</h2>
              <p>{level === "easy" ? "+10 XP per correct answer" : level === "medium" ? "+15 XP per correct answer" : "+25 XP per correct answer"}</p>
            </button>
          ))}
        </section>
        {error && <ErrorPanel message={error} />}
      </Page>
    );
  }

  if (session?.mode === "normal") {
    return (
      <PdfWorkspace 
        title={session.sheet.title} 
        subtitle="Normal Study Mode" 
        pdfUrl="/test.pdf" 
        drawings={drawings}
        setDrawings={setDrawings}
        onClose={() => navigate(`/materials/${materialId}`)} 
      />
    );
  }

  return (
    <Page title={session?.sheet?.title || "Sheet"} subtitle={session?.mode === "normal" ? "Normal Study mode" : "Advanced Study mode"}>
      {error && <ErrorPanel message={error} />}
      {session?.mode === "advanced" && (
        <>
          <AdvancedStudyPanel 
            session={session} 
            drawings={drawings}
            setDrawings={setDrawings}
            onQuiz={() => loadQuiz(false)} 
            onFinal={() => loadQuiz(true)} 
            onFullscreen={() => setFullscreenPdf(true)}
            busy={busy} 
          />
          {fullscreenPdf && (
            <PdfWorkspace 
              title={session.sheet.title} 
              subtitle={`Advanced Study - Pages ${session.block.pageStart}-${session.block.pageEnd}`} 
              pdfUrl="/test.pdf" 
              drawings={drawings}
              setDrawings={setDrawings}
              onClose={() => setFullscreenPdf(false)} 
            />
          )}
          {quiz && <QuizPanel quiz={quiz} answers={answers} setAnswers={setAnswers} onSubmit={submitQuiz} busy={busy} />}
          {result && (
            <QuizResultPanel
              result={result}
              onNext={() => startAdvanced(difficulty)}
              onContinue={continueAfterReview}
              onRetake={retakeQuiz}
              busy={busy}
            />
          )}
        </>
      )}
      <div className="study-footer-actions">
        <Link className="btn btn-soft" to={`/materials/${materialId}`}>Back to sheets</Link>
      </div>
    </Page>
  );
}

function AdvancedStudyPanel({ session, drawings, setDrawings, onQuiz, onFinal, onFullscreen, busy }) {
  const { progress, block } = session;
  return (
    <section className="advanced-layout">
      <article className="advanced-status">
        <div>
          <p className="eyebrow">{session.difficulty} mode</p>
          <h2>Pages {block.pageStart}-{block.pageEnd}</h2>
          <p>Only 3 pages are unlocked. Finish this block, then take the checkpoint quiz.</p>
        </div>
        <div className="xp-card"><span>XP</span><strong>{progress.xp}</strong></div>
        <div className="advanced-progress">
          <span>{progress.masteryStatus}</span>
          <ProgressLine value={Math.round((progress.unlockedPages / progress.totalPages) * 100)} />
          <small>{progress.unlockedPages}/{progress.totalPages} pages unlocked</small>
        </div>
      </article>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 700 }}>Study Material</h3>
          <button className="btn btn-soft compact" onClick={onFullscreen} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Icon name="expand" size={14} /> Focus Mode
          </button>
        </div>
        <PdfCanvasViewer pdfUrl="/test.pdf" drawings={drawings} setDrawings={setDrawings} enableDrawing={false} />
      </div>
      <article className="advanced-actions">
        {session.weakPoints.length > 0 && (
          <div className="needs-review-list">
            <h2>Needs Review</h2>
            {session.weakPoints.map((item) => <span key={item.topic}>{item.topic} ({item.wrongCount})</span>)}
          </div>
        )}
        {session.finalAvailable ? (
          <button className="btn btn-primary" onClick={onFinal} disabled={busy}>Start Final Boss Quiz</button>
        ) : (
          <button className="btn btn-primary" onClick={onQuiz} disabled={busy || !session.quizRequired}>Take checkpoint quiz</button>
        )}
      </article>
    </section>
  );
}

function SheetPage({ page }) {
  return (
    <article className="sheet-page">
      <span className="pill">Page {page.page}</span>
      <h2>{page.title}</h2>
      {page.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </article>
  );
}

function QuizPanel({ quiz, answers, setAnswers, onSubmit, busy }) {
  const answered = quiz.questions.filter((question) => answers[question.id]).length;
  return (
    <section className="quiz-panel">
      <div className="panel-title"><h2>{quiz.isFinal ? "Final Boss Quiz" : "Checkpoint Quiz"}</h2><span>{answered}/{quiz.questions.length}</span></div>
      {quiz.questions.map((question) => (
        <article className="quiz-question" key={question.id}>
          <span className="pill">{question.type.replace("_", " ")} - Page {question.page}</span>
          <h3>{question.prompt}</h3>
          <div className="choices">
            {question.choices.map((choice, index) => (
              <button
                key={choice}
                className={answers[question.id] === choice ? "selected" : ""}
                onClick={() => setAnswers((current) => ({ ...current, [question.id]: choice }))}
                aria-pressed={answers[question.id] === choice}
              >
                <span className="choice-prefix">{String.fromCharCode(65 + index)}</span>
                <span>{choice}</span>
              </button>
            ))}
          </div>
        </article>
      ))}
      <button className="btn btn-primary" onClick={onSubmit} disabled={busy || answered !== quiz.questions.length}>Submit quiz</button>
    </section>
  );
}

function QuizResultPanel({ result, onNext, onContinue, onRetake, busy }) {
  return (
    <section className="quiz-result">
      <article className="result-hero">
        <div><p className="eyebrow">Score</p><h2>{result.score}%</h2><p>{result.message}</p></div>
        <div className="xp-card"><span>XP earned</span><strong>{result.xpAwarded}</strong></div>
      </article>
      {result.weakPoints.length > 0 && (
        <article className="panel needs-review-list">
          <h2>Needs Review</h2>
          {result.weakPoints.map((topic) => <span key={topic}>{topic}</span>)}
        </article>
      )}
      <article className="panel mistake-review">
        <div className="panel-title"><h2>Review My Mistakes</h2><span>{result.wrongItems.length}</span></div>
        {result.wrongItems.length ? result.wrongItems.map((item) => (
          <div className="mistake-row" key={item.questionId}>
            <h3>{item.question}</h3>
            <p>Your answer: <strong>{item.userAnswer}</strong></p>
            <p>Correct answer: <strong>{item.correctAnswer}</strong></p>
            <small>{item.explanation}</small>
          </div>
        )) : <p className="muted">No mistakes in this quiz.</p>}
      </article>
      <div className="result-actions">
        {result.unlockedNext && <button className="btn btn-primary" onClick={onNext} disabled={busy}>Open next 3 pages</button>}
        {result.canContinue && <button className="btn btn-primary" onClick={onContinue} disabled={busy}>Continue to next 3 pages</button>}
        {(result.canContinue || result.mustRetake || result.isFinal) && <button className="btn btn-soft" onClick={onRetake} disabled={busy}>Retake with new placeholders</button>}
      </div>
    </section>
  );
}

function PdfWorkspace({ title, subtitle, pdfUrl, drawings, setDrawings, onClose }) {
  const [activeTool, setActiveTool] = useState("none"); // "none" (scroll), "pen", "highlighter", "eraser"
  const [activeColor, setActiveColor] = useState("yellow"); // "yellow", "green", "pink", "blue", "red"
  const [brushSize, setBrushSize] = useState("medium"); // "small", "medium", "large"
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.2); // start slightly larger for readability

  const handleClearAll = () => {
    if (window.confirm("هل أنت متأكد من مسح جميع الرسومات في هذا المستند؟")) {
      setDrawings({});
    }
  };

  return (
    <div className="pdf-workspace-overlay" role="dialog" aria-modal="true" aria-label="PDF Study Workspace">
      <header className="pdf-workspace-header">
        <button className="icon-btn" onClick={onClose} aria-label="Close PDF viewer">
          <Icon name="arrow-left" size={20} />
        </button>
        <div className="pdf-workspace-title">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="pdf-workspace-actions">
          {/* Zoom controls inside the header */}
          <div className="zoom-controls" style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "16px", background: "var(--bg)", borderRadius: "8px", padding: "4px 8px", border: "1px solid var(--border)" }}>
            <button className="icon-btn" onClick={() => setZoomScale(z => Math.max(0.8, z - 0.1))} title="تصغير">
              <Icon name="minus" size={16} />
            </button>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, minWidth: "48px", textAlign: "center", color: "var(--text-primary)" }}>
              {Math.round(zoomScale * 100)}%
            </span>
            <button className="icon-btn" onClick={() => setZoomScale(z => Math.min(3.0, z + 0.1))} title="تكبير">
              <Icon name="plus" size={16} />
            </button>
          </div>
          <button className="btn btn-primary" onClick={onClose}>Done Studying</button>
        </div>
      </header>

      {/* Floating Toolbar Sidebar */}
      <aside className={`pdf-study-sidebar ${isSidebarOpen ? "open" : ""}`}>
        <button 
          className="sidebar-toggle-tab" 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label={isSidebarOpen ? "Collapse toolbar" : "Expand toolbar"}
          title={isSidebarOpen ? "إخفاء شريط الأدوات" : "إظهار شريط الأدوات"}
        >
          <Icon name={isSidebarOpen ? "chevron-left" : "chevron-right"} size={16} />
        </button>
        <div className="sidebar-section">
          <span className="sidebar-section-title">الأدوات</span>
          <button 
            className={`tool-button ${activeTool === "none" ? "active" : ""}`} 
            onClick={() => setActiveTool("none")}
            title="تصفح وتمرير الصفحة"
          >
            <Icon name="hand" size={18} />
            <span>تمرير</span>
          </button>
          <button 
            className={`tool-button ${activeTool === "pen" ? "active" : ""}`} 
            onClick={() => setActiveTool("pen")}
            title="قلم كتابة ورسم"
          >
            <Icon name="pencil" size={18} />
            <span>قلم</span>
          </button>
          <button 
            className={`tool-button ${activeTool === "highlighter" ? "active" : ""}`} 
            onClick={() => setActiveTool("highlighter")}
            title="تحديد وإضاءة نصوص"
          >
            <Icon name="highlighter" size={18} />
            <span>تحديد</span>
          </button>
          <button 
            className={`tool-button ${activeTool === "eraser" ? "active" : ""}`} 
            onClick={() => setActiveTool("eraser")}
            title="ممحاة الرسومات"
          >
            <Icon name="eraser" size={18} />
            <span>ممحاة</span>
          </button>
        </div>

        {(activeTool === "pen" || activeTool === "highlighter") && (
          <div className="sidebar-section">
            <span className="sidebar-section-title">الألوان</span>
            <div className="color-palette">
              {["yellow", "green", "pink", "blue", "red"].map((color) => (
                <button
                  key={color}
                  className={`color-dot ${color} ${activeColor === color ? "active" : ""}`}
                  onClick={() => setActiveColor(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}

        {activeTool !== "none" && (
          <div className="sidebar-section">
            <span className="sidebar-section-title">الحجم</span>
            <div className="size-selector">
              {["small", "medium", "large"].map((size) => (
                <button
                  key={size}
                  className={`size-button ${brushSize === size ? "active" : ""}`}
                  onClick={() => setBrushSize(size)}
                >
                  {size === "small" ? "صغير" : size === "medium" ? "وسط" : "كبير"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-section" style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
          <button className="tool-button danger" onClick={handleClearAll} title="مسح الكل">
            <Icon name="trash" size={18} />
            <span>مسح الكل</span>
          </button>
        </div>
      </aside>

      <PdfCanvasViewer 
        pdfUrl={pdfUrl} 
        drawings={drawings} 
        setDrawings={setDrawings}
        activeTool={activeTool}
        activeColor={activeColor}
        brushSize={brushSize}
        enableDrawing={true}
        zoomScale={zoomScale}
        setZoomScale={setZoomScale}
      />
    </div>
  );
}

function usePdfJs() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.pdfjsLib) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      setLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  return loaded;
}

function PdfCanvasViewer({ 
  pdfUrl, 
  drawings, 
  setDrawings, 
  activeTool = "none", 
  activeColor = "yellow", 
  brushSize = "medium",
  enableDrawing = true,
  zoomScale = 1,
  setZoomScale = () => {}
}) {
  const isPdfJsLoaded = usePdfJs();
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const containerRef = useRef(null);
  const touchStateRef = useRef({ initialDistance: 0, initialZoom: 1 });

  // Dynamically attach touch listeners to handle multi-touch zooming correctly on iPad OS Safari
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enableDrawing) return;

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStateRef.current.initialDistance = Math.sqrt(dx * dx + dy * dy);
        touchStateRef.current.initialZoom = zoomScale;
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault(); // Prevents default iPadOS full viewport scaling
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const factor = distance / touchStateRef.current.initialDistance;
        let newZoom = touchStateRef.current.initialZoom * factor;
        
        newZoom = Math.max(0.8, Math.min(3.0, newZoom));
        setZoomScale(newZoom);
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
    };
  }, [zoomScale, setZoomScale, enableDrawing]);

  useEffect(() => {
    if (!isPdfJsLoaded) return;
    setLoading(true);
    setError("");

    const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
    loadingTask.promise.then(
      (loadedPdf) => {
        setPdf(loadedPdf);
        setNumPages(loadedPdf.numPages);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("فشل تحميل ملف الـ PDF. يرجى التأكد من اتصال الإنترنت ووجود الملف.");
        setLoading(false);
      }
    );
  }, [pdfUrl, isPdfJsLoaded]);

  return (
    <div className="pdf-canvas-viewer-container" ref={containerRef}>
      {loading && <div className="pdf-viewer-loading">جاري تحميل ملف الـ PDF...</div>}
      {error && <div className="pdf-viewer-error">{error}</div>}
      {!loading && !error && pdf && (
        <div className="pdf-canvas-pages-list" style={{ zoom: zoomScale }}>
          {Array.from({ length: numPages }, (_, index) => {
            const pageNum = index + 1;
            return (
              <PdfPageRenderer 
                key={pageNum} 
                pdf={pdf} 
                pageNumber={pageNum} 
                strokes={drawings[pageNum] || []}
                onSaveStrokes={(newStrokes) => setDrawings(prev => ({ ...prev, [pageNum]: newStrokes }))}
                activeTool={activeTool}
                activeColor={activeColor}
                brushSize={brushSize}
                enableDrawing={enableDrawing}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function PdfPageRenderer({ 
  pdf, 
  pageNumber, 
  strokes, 
  onSaveStrokes, 
  activeTool, 
  activeColor, 
  brushSize,
  enableDrawing = true
}) {
  const canvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const [rendering, setRendering] = useState(true);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef([]);
  const [dprValue, setDprValue] = useState(1);

  const getPenColor = (color) => {
    const map = {
      yellow: "#f59e0b",
      green: "#10b981",
      pink: "#ec4899",
      blue: "#3b82f6",
      red: "#ef4444"
    };
    return map[color] || "#f59e0b";
  };

  const getHighlighterColor = (color) => {
    const map = {
      yellow: "rgba(253, 224, 71, 0.45)",
      green: "rgba(110, 231, 183, 0.45)",
      pink: "rgba(244, 114, 182, 0.45)",
      blue: "rgba(147, 197, 253, 0.45)",
      red: "rgba(252, 165, 165, 0.45)"
    };
    return map[color] || "rgba(253, 224, 71, 0.45)";
  };

  const getToolSize = (tool, size) => {
    if (tool === "highlighter") {
      const sizes = { small: 12, medium: 20, large: 32 };
      return sizes[size] || 20;
    } else if (tool === "eraser") {
      const sizes = { small: 12, medium: 24, large: 44 };
      return sizes[size] || 24;
    } else {
      const sizes = { small: 2.5, medium: 4.5, large: 8 };
      return sizes[size] || 4.5;
    }
  };

  const getCoordinates = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    return { x: clientX, y: clientY };
  };

  useEffect(() => {
    let renderTask = null;
    pdf.getPage(pageNumber).then((page) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      const dpr = window.devicePixelRatio || 1;
      setDprValue(dpr);

      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.scale(dpr, dpr);

      const drawCanvas = drawCanvasRef.current;
      if (drawCanvas) {
        drawCanvas.width = viewport.width * dpr;
        drawCanvas.height = viewport.height * dpr;
        drawCanvas.style.width = `${viewport.width}px`;
        drawCanvas.style.height = `${viewport.height}px`;
      }

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      renderTask = page.render(renderContext);
      renderTask.promise.then(() => {
        setRendering(false);
      }).catch(() => {});
    });

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNumber]);

  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawStrokes(context, strokes, dprValue);
  }, [strokes, dprValue]);

  const drawStrokes = (context, strokeList, dpr) => {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    if (!strokeList) return;

    strokeList.forEach((stroke) => {
      if (stroke.points.length === 0) return;

      context.beginPath();
      context.lineCap = "round";
      context.lineJoin = "round";

      if (stroke.tool === "eraser") {
        context.globalCompositeOperation = "destination-out";
        context.lineWidth = stroke.size * dpr;
      } else {
        context.globalCompositeOperation = "source-over";
        context.strokeStyle = stroke.color;
        context.lineWidth = stroke.size * dpr;
      }

      if (stroke.points.length < 3) {
        const firstPoint = stroke.points[0];
        context.moveTo(firstPoint.x * dpr, firstPoint.y * dpr);
        if (stroke.points.length === 2) {
          const secondPoint = stroke.points[1];
          context.lineTo(secondPoint.x * dpr, secondPoint.y * dpr);
        }
        context.stroke();
        return;
      }

      // Smooth curves using quadratic Bezier curves through midpoints
      context.moveTo(stroke.points[0].x * dpr, stroke.points[0].y * dpr);
      
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
        context.quadraticCurveTo(
          stroke.points[i].x * dpr, 
          stroke.points[i].y * dpr, 
          xc * dpr, 
          yc * dpr
        );
      }

      context.lineTo(
        stroke.points[stroke.points.length - 1].x * dpr, 
        stroke.points[stroke.points.length - 1].y * dpr
      );
      context.stroke();
    });

    context.globalCompositeOperation = "source-over";
  };

  const handlePointerDown = (e) => {
    if (activeTool === "none") return;
    
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);

    const canvas = drawCanvasRef.current;
    const point = getCoordinates(e, canvas);

    isDrawingRef.current = true;
    currentPointsRef.current = [point];

    const context = canvas.getContext("2d");
    const activeStroke = {
      tool: activeTool,
      color: activeTool === "highlighter" ? getHighlighterColor(activeColor) : getPenColor(activeColor),
      size: getToolSize(activeTool, brushSize),
      points: currentPointsRef.current
    };
    
    drawStrokes(context, [...strokes, activeStroke], dprValue);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    
    e.preventDefault();

    const canvas = drawCanvasRef.current;
    const point = getCoordinates(e, canvas);

    currentPointsRef.current.push(point);

    const context = canvas.getContext("2d");
    const activeStroke = {
      tool: activeTool,
      color: activeTool === "highlighter" ? getHighlighterColor(activeColor) : getPenColor(activeColor),
      size: getToolSize(activeTool, brushSize),
      points: currentPointsRef.current
    };
    
    drawStrokes(context, [...strokes, activeStroke], dprValue);
  };

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    
    e.preventDefault();
    e.target.releasePointerCapture(e.pointerId);

    isDrawingRef.current = false;

    const finalStroke = {
      tool: activeTool,
      color: activeTool === "highlighter" ? getHighlighterColor(activeColor) : getPenColor(activeColor),
      size: getToolSize(activeTool, brushSize),
      points: [...currentPointsRef.current]
    };
    
    onSaveStrokes([...strokes, finalStroke]);
    currentPointsRef.current = [];
  };

  return (
    <div className="pdf-page-wrapper">
      <span className="pdf-page-number">الصفحة {pageNumber}</span>
      <div className="pdf-canvas-container" style={{ position: "relative" }}>
        <canvas ref={canvasRef} />
        {enableDrawing && (
          <canvas 
            ref={drawCanvasRef} 
            className="pdf-draw-canvas"
            style={{ 
              position: "absolute", 
              inset: 0, 
              zIndex: 5, 
              cursor: activeTool === "none" ? "default" : "crosshair",
              touchAction: activeTool === "none" ? "auto" : "none"
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        )}
      </div>
      {rendering && <div className="pdf-page-spinner" />}
    </div>
  );
}
