import { useAppState } from "../store/store";
import { subjectProgress, consistency, averageDailyMinutes, backlogTrend } from "../lib/analyticsEngine";
import { backlogSnapshot } from "../lib/backlogEngine";
import { formatDuration } from "../lib/format";

export function Analytics() {
  const state = useAppState();
  const progress = subjectProgress(state);
  const habit = consistency(state);
  const avg = averageDailyMinutes(state);
  const snap = backlogSnapshot(state);
  const trend = backlogTrend(state);
  const max = Math.max(...trend.map((t) => t.pending), 1);

  return (
    <div className="page">
      <p className="kicker">Analytics</p>
      <h1>Pattern, not vanity</h1>
      <p className="lede">You studied on {habit.studied} of the last {habit.window} days.</p>
      <div className="dash-grid">
        <section>
          <div className="stat">
            <p className="kicker">Average daily study</p>
            <div className="num">{formatDuration(avg)}</div>
            <p>From logged days in the last two weeks.</p>
          </div>
          <div className="stat">
            <p className="kicker">Backlog now</p>
            <div className="num">{snap.totalLectures}</div>
            <p>
              {formatDuration(snap.totalMinutes)} · cleared {snap.clearedWeek} this week
            </p>
          </div>
        </section>
        <section>
          <p className="kicker">Backlog trend</p>
          <div className="trend" aria-hidden>
            {trend.map((t) => (
              <span key={t.label} style={{ height: `${(t.pending / max) * 100}%` }} title={`${t.label}: ${t.pending}`} />
            ))}
          </div>
          <div className="bar-row" style={{ marginTop: 8, gridTemplateColumns: "repeat(7, 1fr)" }}>
            {trend.map((t) => (
              <span key={t.label} style={{ textAlign: "center", fontSize: 11 }}>
                {t.label}
              </span>
            ))}
          </div>
        </section>
      </div>
      <section style={{ marginTop: 32 }}>
        <p className="kicker">Subject progress</p>
        <div className="bars" style={{ marginTop: 16 }}>
          {progress.map((p) => (
            <div className="bar-row" key={p.name}>
              <span>{p.name}</span>
              <div className="bar">
                <span style={{ ["--w" as string]: `${p.pct}%` }} />
              </div>
              <span>
                {p.completed}/{p.total}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
