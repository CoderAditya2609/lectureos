import { useMemo, useState } from "react";
import { EmptyState, Modal } from "../components/ui";
import { useAppState, store } from "../store/store";
import { lectureLabel, chapterOf, subjectOf, topicOf } from "../lib/taxonomy";
import type { Lecture, LectureStatus } from "../types";

const STATUSES: LectureStatus[] = ["upcoming", "pending", "completed", "missed", "needs_revision"];

export function Lectures() {
  const state = useAppState();
  const [filter, setFilter] = useState<"all" | LectureStatus>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lecture | null>(null);
  const [form, setForm] = useState({
    topicId: "",
    number: 1,
    title: "",
    estimatedMin: 45,
    status: "pending" as LectureStatus,
    scheduledDate: "",
    notes: "",
    tags: "",
  });

  const rows = useMemo(() => {
    return state.lectures
      .filter((l) => filter === "all" || l.status === filter)
      .sort((a, b) => (a.scheduledDate ?? a.createdAt).localeCompare(b.scheduledDate ?? b.createdAt));
  }, [state.lectures, filter]);

  function startNew() {
    setEditing(null);
    setForm({
      topicId: state.topics[0]?.id ?? "",
      number: 1,
      title: "",
      estimatedMin: 45,
      status: "pending",
      scheduledDate: "",
      notes: "",
      tags: "",
    });
    setOpen(true);
  }

  function startEdit(l: Lecture) {
    setEditing(l);
    setForm({
      topicId: l.topicId,
      number: l.number,
      title: l.title,
      estimatedMin: l.estimatedMin,
      status: l.status,
      scheduledDate: l.scheduledDate ?? "",
      notes: l.notes,
      tags: l.tags.join(", "),
    });
    setOpen(true);
  }

  function save() {
    const payload = {
      topicId: form.topicId,
      number: Number(form.number),
      title: form.title.trim() || `Lecture ${form.number}`,
      estimatedMin: Number(form.estimatedMin),
      status: form.status,
      scheduledDate: form.scheduledDate || undefined,
      notes: form.notes,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (editing) store.updateLecture(editing.id, payload);
    else store.addLecture(payload);
    setOpen(false);
  }

  return (
    <div className="page">
      <p className="kicker">Lectures</p>
      <h1>Lecture map</h1>
      <p className="lede">Status, duration, and taxonomy in one working list.</p>
      <div className="toolbar">
        {(["all", ...STATUSES] as const).map((s) => (
          <button key={s} className={`chip ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>
            {s.replace("_", " ")}
          </button>
        ))}
        <button className="btn solid" onClick={startNew} disabled={!state.topics.length}>
          Add lecture
        </button>
      </div>
      {!rows.length ? (
        <EmptyState
          title="Your lecture map starts here."
          body="Add your first lecture to begin tracking progress."
          action={
            <button className="btn" onClick={startNew} disabled={!state.topics.length}>
              {state.topics.length ? "Add lecture" : "Create a topic in Taxonomy first"}
            </button>
          }
        />
      ) : (
        <div className="list">
          <div className="row table-head">
            <span>Lecture</span>
            <span>Taxonomy</span>
            <span>Time</span>
            <span>Status</span>
            <span />
          </div>
          {rows.map((l) => (
            <div className="row" key={l.id}>
              <div>
                <strong>{lectureLabel(state, l)}</strong>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>{l.title}</div>
              </div>
              <div>
                {subjectOf(state, l)?.name} / {chapterOf(state, l)?.name}
                <div style={{ color: "var(--faint)", fontSize: 12 }}>{topicOf(state, l)?.name}</div>
              </div>
              <div>
                {l.estimatedMin}m
                {l.scheduledDate ? <div style={{ color: "var(--faint)" }}>{l.scheduledDate}</div> : null}
              </div>
              <div>
                <select
                  className={`select status ${l.status}`}
                  value={l.status}
                  onChange={(e) => store.setLectureStatus(l.id, e.target.value as LectureStatus)}
                  aria-label="Status"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button className="icon-btn" onClick={() => startEdit(l)}>
                  Edit
                </button>
                <button className="icon-btn" onClick={() => store.deleteLecture(l.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title={editing ? "Edit lecture" : "New lecture"} onClose={() => setOpen(false)}>
          <div className="fields">
            <label>
              <span>Topic</span>
              <select className="select" value={form.topicId} onChange={(e) => setForm({ ...form, topicId: e.target.value })}>
                {state.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Number</span>
              <input className="field" type="number" value={form.number} onChange={(e) => setForm({ ...form, number: Number(e.target.value) })} />
            </label>
            <label>
              <span>Title</span>
              <input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label>
              <span>Estimated minutes</span>
              <input className="field" type="number" value={form.estimatedMin} onChange={(e) => setForm({ ...form, estimatedMin: Number(e.target.value) })} />
            </label>
            <label>
              <span>Status</span>
              <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LectureStatus })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Scheduled</span>
              <input className="field" type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
            </label>
            <label>
              <span>Notes</span>
              <textarea className="field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
            <label>
              <span>Tags</span>
              <input className="field" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn solid" onClick={save}>
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
