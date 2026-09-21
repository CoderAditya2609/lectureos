import { useAppState, store } from "../store/store";
import { backlogSnapshot, recoveryCopy, formatBacklogHours } from "../lib/backlogEngine";
import { buildPlan } from "../lib/planner";
import { EmptyState } from "../components/ui";
import { lectureLabel } from "../lib/taxonomy";

export function Backlog() {
  const state = useAppState();
  const snap = backlogSnapshot(state);
  const plan = buildPlan(state);

  if (!snap.totalLectures) {
    return (
      <div className="page">
        <p className="kicker">Backlog</p>
        <EmptyState title="Backlog cleared." body="Nothing is waiting. Add lectures when the next batch lands." />
      </div>
    );
  }

  return (
    <div className="page">
      <p className="kicker">Backlog</p>
      <h1>{snap.totalLectures} lectures</h1>
      <p className="lede">
        {formatBacklogHours(snap.totalMinutes)} outstanding. Cleared {snap.clearedToday} today, {snap.clearedWeek} this week.
        Growth this week: {snap.growthWeek >= 0 ? "+" : ""}
        {snap.growthWeek}.
      </p>
      <p style={{ color: "var(--muted)", maxWidth: "54ch" }}>{recoveryCopy(snap)}</p>

      <div className="list" style={{ marginTop: 28 }}>
        {snap.items.map((item) => (
          <div className="row" key={item.subject.id} style={{ gridTemplateColumns: "1fr auto auto" }}>
            <strong>{item.subject.name}</strong>
            <span>{item.lectures.length} lectures</span>
            <span>{formatBacklogHours(item.minutes)}</span>
          </div>
        ))}
      </div>

      {plan.primary && (
        <section className="recommend">
          <p className="kicker">Priority</p>
          <p className="big">{plan.primary.title}</p>
          <ul className="reasons">
            {plan.primary.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {plan.primary.lectureId && (
            <button className="btn" style={{ marginTop: 12 }} onClick={() => store.setLectureStatus(plan.primary!.lectureId!, "completed")}>
              Mark lecture complete
            </button>
          )}
        </section>
      )}

      <h2 style={{ fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)" }}>By lecture</h2>
      {snap.items.flatMap((item) =>
        item.lectures.map((l) => (
          <div className="row" key={l.id} style={{ gridTemplateColumns: "1fr auto auto" }}>
            <span>{lectureLabel(state, l)}</span>
            <span className={`status ${l.status}`}>{l.status}</span>
            <span>{l.estimatedMin}m</span>
          </div>
        )),
      )}
    </div>
  );
}
