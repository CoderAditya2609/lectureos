import { useState } from "react";
import { useAppState, store } from "../store/store";
import { EmptyState } from "../components/ui";
import { lecturesForTopic } from "../lib/taxonomy";
import { LiquidMetalButton } from "../components/LiquidMetal";

export function Taxonomy() {
  const state = useAppState();
  const [subjectName, setSubjectName] = useState("");

  if (!state.subjects.length) {
    return (
      <div className="page">
        <p className="kicker">Taxonomy</p>
        <EmptyState
          title="Subject → chapter → topic → lecture"
          body="Build the map your planner will actually use. Start with Physics, Chemistry, Maths — or whatever you sit with."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!subjectName.trim()) return;
            store.addSubject(subjectName.trim());
            setSubjectName("");
          }}
        >
          <input className="field" placeholder="First subject" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
        </form>
      </div>
    );
  }

  return (
    <div className="page">
      <p className="kicker">Taxonomy</p>
      <h1>The map</h1>
      <p className="lede">Create, rename, and delete levels. Lectures inherit this structure.</p>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          if (!subjectName.trim()) return;
          store.addSubject(subjectName.trim());
          setSubjectName("");
        }}
      >
        <input className="field" placeholder="New subject" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
        <button className="btn solid" type="submit">
          Add subject
        </button>
      </form>
      <div className="tree">
        {[...state.subjects].sort((a, b) => a.order - b.order).map((subject) => (
          <section className="subject-block" key={subject.id}>
            <h2>
              <InlineRename value={subject.name} onSave={(name) => store.renameSubject(subject.id, name)} />
            </h2>
            <LiquidMetalButton size="sm" onClick={() => store.deleteSubject(subject.id)}>
              Delete subject
            </LiquidMetalButton>
            <AddInline placeholder="Add chapter" onAdd={(name) => store.addChapter(subject.id, name)} />
            {state.chapters
              .filter((c) => c.subjectId === subject.id)
              .sort((a, b) => a.order - b.order)
              .map((chapter) => (
                <div className="chapter" key={chapter.id}>
                  <h3>
                    <InlineRename value={chapter.name} onSave={(name) => store.updateChapter(chapter.id, { name })} />
                  </h3>
                  <label style={{ fontSize: 12, color: "var(--muted)" }}>
                    Importance
                    <input
                      className="field"
                      type="number"
                      min={1}
                      max={5}
                      value={chapter.importance}
                      onChange={(e) => store.updateChapter(chapter.id, { importance: Number(e.target.value) })}
                      style={{ width: 64, marginLeft: 8 }}
                    />
                  </label>
                  <LiquidMetalButton size="sm" onClick={() => store.deleteChapter(chapter.id)}>
                    Delete chapter
                  </LiquidMetalButton>
                  <AddInline placeholder="Add topic" onAdd={(name) => store.addTopic(chapter.id, name)} />
                  {state.topics
                    .filter((t) => t.chapterId === chapter.id)
                    .sort((a, b) => a.order - b.order)
                    .map((topic) => (
                      <div className="topic" key={topic.id}>
                        <div className="topic-head">
                          <InlineRename value={topic.name} onSave={(name) => store.renameTopic(topic.id, name)} />
                          <LiquidMetalButton size="sm" className="lmb-icon-only" onClick={() => store.deleteTopic(topic.id)} aria-label="Delete topic">
                            ×
                          </LiquidMetalButton>
                        </div>
                        {lecturesForTopic(state, topic.id).map((l) => (
                          <div className="lecture-mini" key={l.id}>
                            <span>L{l.number}</span>
                            <span>{l.title}</span>
                            <span className={`status ${l.status}`}>{l.status}</span>
                          </div>
                        ))}
                        <AddInline
                          placeholder="Add lecture title"
                          onAdd={(title) =>
                            store.addLecture({
                              topicId: topic.id,
                              number: lecturesForTopic(state, topic.id).length + 1,
                              title,
                              estimatedMin: 45,
                              status: "pending",
                              notes: "",
                              tags: [],
                            })
                          }
                        />
                      </div>
                    ))}
                </div>
              ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function InlineRename({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  return (
    <input
      className="ghost-input"
      value={value}
      aria-label="Rename"
      onChange={(e) => onSave(e.target.value)}
    />
  );
}

function AddInline({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.trim()) return;
        onAdd(v.trim());
        setV("");
      }}
      style={{ margin: "6px 0 10px" }}
    >
      <input className="ghost-input" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
    </form>
  );
}
