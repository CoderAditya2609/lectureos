import { useState } from "react";
import { useAppState } from "../store/store";
import { askLectureAI } from "../ai/provider";
import { buildPlan, planToText } from "../lib/planner";
import { LiquidButton } from "../components/LiquidButton";

const PROMPTS = [
  "What should I do now?",
  "Prioritize my backlog and explain why.",
  "What is getting stale and should be revised?",
  "Estimate backlog recovery from my timetable.",
  "How is my progress looking this week?",
];

export function AIScreen() {
  const state = useAppState();
  const [q, setQ] = useState("What should I do now?");
  const [a, setA] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(question: string) {
    setBusy(true);
    setQ(question);
    const local = planToText(buildPlan(state));
    if (!state.settings.nvidiaApiKey.trim()) {
      setA(`${local}\n\nAdd a NVIDIA API key in Settings for model-backed analysis. The local planner already uses your timetable, backlog, and revisions.`);
      setBusy(false);
      return;
    }
    try {
      setA(await askLectureAI(state, question));
    } catch (err) {
      setA(`${local}\n\n${err instanceof Error ? err.message : "AI unavailable"}`);
    }
    setBusy(false);
  }

  return (
    <div className="page">
      <p className="kicker">AI · {state.settings.aiProvider}</p>
      <h1>Ask the board</h1>
      <p className="lede">
        The model reads your lectures, timetable, backlog, and revision state. It does not need pasted context.
      </p>
      <div className="toolbar">
        {PROMPTS.map((p) => (
          <button key={p} className="chip" onClick={() => run(p)}>
            {p}
          </button>
        ))}
      </div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
      >
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Question" />
        <LiquidButton onClick={() => run(q)} disabled={busy}>
          {busy ? "Thinking" : "Ask"}
        </LiquidButton>
      </form>
      {a && <div className="bubble chat" style={{ marginTop: 28 }}>{a}</div>}
    </div>
  );
}
