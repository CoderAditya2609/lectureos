import { useState } from "react";
import { useAppState, store } from "../store/store";
import { revisionViews, type RevisionBucket } from "../lib/revisionEngine";
import { EmptyState } from "../components/ui";

const BUCKETS: { id: RevisionBucket | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "due", label: "Due" },
  { id: "approaching", label: "Approaching" },
  { id: "fresh", label: "Fresh" },
  { id: "weak", label: "Weak" },
];

export function Revision() {
  const state = useAppState();
  const [bucket, setBucket] = useState<RevisionBucket | "all">("all");
  const [sort, setSort] = useState<"urgency" | "subject" | "chapter" | "last" | "performance">("urgency");
  let views = revisionViews(state);
  if (bucket !== "all") views = views.filter((v) => v.bucket === bucket);
  views = [...views].sort((a, b) => {
    if (sort === "subject") return a.subject.localeCompare(b.subject);
    if (sort === "chapter") return a.chapter.localeCompare(b.chapter);
    if (sort === "last") return (a.item.lastRevision ?? "").localeCompare(b.item.lastRevision ?? "");
    if (sort === "performance") return (a.item.performance ?? 100) - (b.item.performance ?? 100);
    return a.daysUntil - b.daysUntil;
  });

  return (
    <div className="page">
      <p className="kicker">Revision</p>
      <h1>Memory, not panic</h1>
      <p className="lede">Intervals are suggestions. Language stays honest: something may be becoming stale. Nothing here claims you have forgotten.</p>
      <div className="toolbar">
        {BUCKETS.map((b) => (
          <button key={b.id} className={`chip ${bucket === b.id ? "active" : ""}`} onClick={() => setBucket(b.id)}>
            {b.label}
          </button>
        ))}
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
          <option value="urgency">Urgency</option>
          <option value="subject">Subject</option>
          <option value="chapter">Chapter</option>
          <option value="last">Last revision</option>
          <option value="performance">Performance</option>
        </select>
      </div>
      {!views.length ? (
        <EmptyState
          title="Nothing needs revision yet."
          body="LectureOS will let you know when something starts getting stale."
        />
      ) : (
        views.map((v) => (
          <div className="row" key={v.item.id} style={{ gridTemplateColumns: "1.4fr 0.6fr 0.6fr auto" }}>
            <div>
              <strong>{v.label}</strong>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {v.stale ? "This may be becoming stale." : v.bucket}
                {v.item.mistakes[0] ? ` · ${v.item.mistakes[0]}` : ""}
              </div>
            </div>
            <span>
              {v.daysUntil <= 0 ? "due" : `in ${v.daysUntil}d`}
            </span>
            <span>conf {v.item.confidence}/5</span>
            <button
              className="btn"
              onClick={() => {
                const conf = Number(prompt("Confidence 1–5", String(v.item.confidence)) ?? v.item.confidence);
                store.markRevision(v.item.id, Math.min(5, Math.max(1, conf)), v.item.performance);
              }}
            >
              Mark revised
            </button>
          </div>
        ))
      )}
    </div>
  );
}
