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
import { buildPlan, planToText } from "../lib/planner";
import { askLectureAI } from "../ai/provider";

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
  const [planText, setPlanText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  async function recommend() {
    setBusy(true);
    const local = buildPlan(state);
    setPlanText(planToText(local));
    if (state.settings.nvidiaApiKey.trim()) {
      try {
        const ai = await askLectureAI(
          state,
          "What should I do now? Recommend one next task that fits remaining time, then optionally a second. Be practical. Include a short because-list.",
        );
        setPlanText(ai);
      } catch (err) {
        setPlanText(`${planToText(local)}\n\nAI note: ${err instanceof Error ? err.message : "unavailable"}`);
      }
    }
    setBusy(false);
  }

  return (
    <div className="page">
      <p className="kicker">LectureOS</p>
      <div className="hero-row">
        <div>
          <h1>
            <RevealTitle text={`${greeting()}, ${state.settings.displayName}`} />
          </h1>
          <p className="lede">Here’s what actually matters today.</p>
        </div>
        <LiquidButton onClick={recommend} disabled={busy}>
          {busy ? "Reading the board…" : "What should I do now?"}
        </LiquidButton>
      </div>

      {planText && (
        <section className="recommend" aria-live="polite">
          <p className="kicker">Next</p>
          <pre className="bubble" style={{ border: 0, padding: 0, fontFamily: "inherit" }}>
            {planText}
          </pre>
        </section>
      )}

      <div className="dash-grid">
        <section className="today">
          <div className="section-title">
            <h2>Today</h2>
            <span style={{ color: "var(--faint)", fontSize: 12 }}>
              {tasks.filter((t) => t.done).length}/{tasks.length || 0}
            </span>
          </div>
          {tasks.length === 0 ? (
            <EmptyState
              title="The day is still open."
              body="Add the first concrete task. Keep it small enough to start."
            />
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
          <div className="stat">
            <p className="kicker">Available today</p>
            <div className="num">{copy.total}</div>
            <p>{copy.window}</p>
          </div>
          <div className="stat">
            <p className="kicker">Backlog</p>
            <div className="num">{snap.totalLectures}</div>
            <p>
              {formatDuration(snap.totalMinutes)} waiting
              {snap.oldestDays ? ` · oldest ${snap.oldestDays}d` : ""}
            </p>
          </div>
          <div className="stat">
            <p className="kicker">Revision</p>
            <div className="num">{due}</div>
            <p>
              {due} due · {approaching} approaching
            </p>
          </div>
        </aside>
      </div>

      <section style={{ marginTop: 36 }}>
        <div className="section-title">
          <h2>Progress</h2>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            You studied on {habit.studied} of the last {habit.window} days.
          </span>
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
