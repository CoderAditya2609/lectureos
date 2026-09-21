import { useMemo, useState } from "react";
import { LiquidButton } from "../components/LiquidButton";
import { RevealTitle } from "../components/RevealTitle";
import { Check, EmptyState } from "../components/ui";
import { useAppState, store } from "../store/store";
import { greeting, todayISO, formatDuration } from "../lib/format";
import { availability, availabilityCopy } from "../lib/scheduleEngine";
import { backlogSnapshot } from "../lib/backlogEngine";
import { revisionViews } from "../lib/revisionEngine";
import { subjectProgress, consistency } from "../lib/analyticsEngine";
import { buildPlan } from "../lib/planner";
import { askLectureAI } from "../ai/provider";
import { localInsights, navigateLectureOs } from "../lib/insights";
import { topicOf } from "../lib/taxonomy";

export function Dashboard() {
  const state = useAppState();
  const today = todayISO();
  const tasks = [...state.tasks.filter((t) => t.date === today)].sort((a, b) => a.order - b.order);
  const avail = useMemo(() => availability(state), [state]);
  const copy = availabilityCopy(avail);
  const snap = backlogSnapshot(state);
  const revs = revisionViews(state);
  const due = revs.filter((r) => r.bucket === "due").length;
  const approaching = revs.filter((r) => r.bucket === "approaching").length;
  const progress = subjectProgress(state);
  const habit = consistency(state);
  const plan = useMemo(() => buildPlan(state), [state]);
  const insights = useMemo(() => localInsights(state), [state]);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const doneCount = tasks.filter((t) => t.done).length;

  async function recommend() {
    setBusy(true);
    setAiNote(null);
    if (state.settings.nvidiaApiKey.trim()) {
      try {
        let text = "";
        await askLectureAI(
          state,
          "What should I do now? Recommend one next task that fits remaining time, then optionally a second. Be practical. Include a short because-list.",
          (chunk) => {
            text += chunk;
            setAiNote(text);
          },
        );
      } catch (err) {
        setAiNote(err instanceof Error ? err.message : "NVIDIA is unavailable right now.");
      }
    } else {
      setAiNote("Connect NVIDIA in Settings for a model-backed recommendation. The card above already uses your timetable.");
    }
    setBusy(false);
  }

  function startPlan() {
    const item = plan.primary;
    if (!item) return;
    if (item.revisionId) {
      navigateLectureOs("revision");
      return;
    }
    if (item.taskId) return;
    if (item.lectureId) {
      const exists = state.tasks.some((t) => t.date === today && t.lectureId === item.lectureId);
      if (!exists) {
        store.addTask({ title: item.title, lectureId: item.lectureId, durationMin: item.estimatedMin });
      }
    }
  }

  const lecture = plan.primary?.lectureId ? state.lectures.find((l) => l.id === plan.primary?.lectureId) : undefined;
  const topic = lecture ? topicOf(state, lecture) : undefined;

  return (
    <div className="page">
      <p className="kicker">Today</p>
      <div className="hero-row">
        <div>
          <h1>
            <RevealTitle text={`${greeting()}, ${state.settings.displayName}`} />
          </h1>
          <p className="lede">Here’s what actually matters today.</p>
        </div>
        <LiquidButton onClick={recommend} disabled={busy}>
          {busy ? "Reading the board…" : "Ask NVIDIA"}
        </LiquidButton>
      </div>

      <section className="now-card surface-primary" aria-live="polite">
        <p className="kicker">What should I do now?</p>
        {plan.primary ? (
          <>
            <h2 className="now-title">{plan.primary.title}</h2>
            <p className="now-meta">
              {lecture ? `Lecture ${lecture.number}` : plan.primary.kind}
              {topic ? ` · ${topic.name}` : ""}
              {` · ~${plan.primary.estimatedMin} min`}
            </p>
            <p className="now-reason">Reason: {plan.primary.reasons.slice(0, 2).join(" · ") || plan.note}</p>
            <div className="now-actions">
              <button className="btn solid" type="button" onClick={startPlan}>
                Start
              </button>
              <span className="meta-line">{formatDuration(avail.remainingMin)} left in timetable</span>
            </div>
          </>
        ) : (
          <EmptyState
            title="Nothing fits this window."
            body={plan.note}
            action={
              <button className="btn" type="button" onClick={() => navigateLectureOs("schedule")}>
                Check schedule
              </button>
            }
          />
        )}
        {busy && !aiNote && (
          <p className="ai-thinking">
            <span className="pulse-dot" /> Connecting to NVIDIA…
          </p>
        )}
        {aiNote && <p className="ai-note">{aiNote}</p>}
      </section>

      <div className="dash-grid">
        <section className="today surface-card">
          <div className="section-title">
            <h2>Today’s tasks</h2>
            <span className="meta-line">
              {doneCount}/{tasks.length || 0}
            </span>
          </div>
          {tasks.length === 0 ? (
            <EmptyState title="The day is still open." body="Add the first concrete task. Keep it small enough to start." />
          ) : (
            tasks.map((task) => (
              <div
                className={`task ${task.done ? "done" : ""}`}
                key={task.id}
                draggable
                onDragStart={() => setDragId(task.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) store.reorderTasks(today, dragId, task.id);
                  setDragId(null);
                }}
              >
                <Check checked={task.done} onToggle={() => store.toggleTask(task.id)} label={task.title} />
                <div className="task-title">
                  <input
                    value={task.title}
                    aria-label="Edit task"
                    onChange={(e) => store.updateTask(task.id, { title: e.target.value })}
                  />
                </div>
                <button className="icon-btn" type="button" onClick={() => store.deleteTask(task.id)} aria-label="Delete">
                  ×
                </button>
              </div>
            ))
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              store.addTask({ title: draft.trim() });
              setDraft("");
            }}
            style={{ marginTop: 12 }}
          >
            <input
              className="ghost-input"
              placeholder="Add a task and press Enter"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </form>
        </section>

        <aside className="stat-stack">
          <div className="stat surface-card">
            <p className="kicker">Available today</p>
            <div className="num">{copy.total}</div>
            <p>{copy.window}</p>
          </div>
          <div className="stat surface-card">
            <p className="kicker">Backlog</p>
            <div className="num">{snap.totalLectures}</div>
            <p>
              {formatDuration(snap.totalMinutes)} waiting
              {snap.oldestDays ? ` · oldest ${snap.oldestDays}d` : ""}
            </p>
          </div>
          <div className="stat surface-card">
            <p className="kicker">Revision</p>
            <div className="num">{due}</div>
            <p>
              {due} due · {approaching} approaching
            </p>
          </div>
        </aside>
      </div>

      {insights.length > 0 && (
        <section className="insight-grid">
          {insights.map((insight) => (
            <article className="insight-card surface-card" key={insight.id}>
              <p className="kicker">{insight.kicker}</p>
              <h3>{insight.title}</h3>
              <p>Suggested action: {insight.action}</p>
              <button className="btn" type="button" onClick={() => insight.route && navigateLectureOs(insight.route)}>
                {insight.cta}
              </button>
            </article>
          ))}
        </section>
      )}

      <section className="progress-block">
        <div className="section-title">
          <h2>Progress</h2>
          <span className="meta-line">You studied on {habit.studied} of the last {habit.window} days.</span>
        </div>
        <div className="bars">
          {progress.map((p) => (
            <div className="bar-row" key={p.name}>
              <span>{p.name}</span>
              <div className="bar">
                <span style={{ ["--w" as string]: `${p.pct}%` }} />
              </div>
              <span>{p.pct}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
