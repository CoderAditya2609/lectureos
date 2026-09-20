import { useState } from "react";
import { useAppState, store } from "../store/store";
import { blocksForDay, availability, availabilityCopy } from "../lib/scheduleEngine";
import { weekdayName } from "../lib/format";
import { EmptyState } from "../components/ui";
import type { TimeKind } from "../types";

export function Schedule() {
  const state = useAppState();
  const [day, setDay] = useState(new Date().getDay());
  const [form, setForm] = useState({ start: "21:00", end: "23:00", label: "Free", kind: "available" as TimeKind });
  const blocks = blocksForDay(state, day);
  const avail = availability(state);

  return (
    <div className="page">
      <p className="kicker">Schedule</p>
      <h1>Usable hours</h1>
      <p className="lede">
        {availabilityCopy(avail).total} remaining today. Realistic study capacity on this pattern: about{" "}
        {Math.round(avail.realisticMin / 60) || 0}h {avail.realisticMin % 60}m.
      </p>
      <div className="toolbar">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
          <button key={d} className={`chip ${day === d ? "active" : ""}`} onClick={() => setDay(d)}>
            {weekdayName(d)}
          </button>
        ))}
      </div>
      {!blocks.length ? (
        <EmptyState title="No timetable for this day." body="Block school, coaching, travel, and sleep. Mark the rest available or optional." />
      ) : (
        <div className="timeline">
          {blocks.map((b) => (
            <div className="block" key={b.id}>
              <input className="field" type="time" value={b.start} onChange={(e) => store.updateBlock(b.id, { start: e.target.value })} />
              <input className="field" value={b.label} onChange={(e) => store.updateBlock(b.id, { label: e.target.value })} />
              <select className={`select kind-${b.kind}`} value={b.kind} onChange={(e) => store.updateBlock(b.id, { kind: e.target.value as TimeKind })}>
                <option value="available">Available</option>
                <option value="optional">Optional</option>
                <option value="blocked">Blocked</option>
              </select>
              <button className="icon-btn" onClick={() => store.deleteBlock(b.id)}>
                ×
              </button>
              <input className="field" type="time" value={b.end} onChange={(e) => store.updateBlock(b.id, { end: e.target.value })} />
            </div>
          ))}
        </div>
      )}
      <form
        className="toolbar"
        style={{ marginTop: 24 }}
        onSubmit={(e) => {
          e.preventDefault();
          store.addBlock({ dayOfWeek: day, ...form });
        }}
      >
        <input className="field" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
        <input className="field" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
        <input className="field" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <select className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as TimeKind })}>
          <option value="available">Available</option>
          <option value="optional">Optional</option>
          <option value="blocked">Blocked</option>
        </select>
        <button className="btn solid" type="submit">
          Add block
        </button>
      </form>
      <p className="lede" style={{ marginTop: 16 }}>
        Copy this day to:
      </p>
      <div className="toolbar">
        {[0, 1, 2, 3, 4, 5, 6]
          .filter((d) => d !== day)
          .map((d) => (
            <button key={d} className="btn" onClick={() => store.copyDay(day, d)}>
              {weekdayName(d)}
            </button>
          ))}
      </div>
    </div>
  );
}
