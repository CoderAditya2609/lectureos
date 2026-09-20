import type { AppState } from "../types";
import { backlogSnapshot, recoveryCopy } from "../lib/backlogEngine";
import { availability, availabilityCopy } from "../lib/scheduleEngine";
import { revisionViews } from "../lib/revisionEngine";
import { subjectProgress, consistency } from "../lib/analyticsEngine";
import { lectureLabel, pendingLike, subjectOf } from "../lib/taxonomy";
import { todayISO, formatDuration } from "../lib/format";

export function buildAiContext(state: AppState): string {
  const snap = backlogSnapshot(state);
  const avail = availability(state);
  const copy = availabilityCopy(avail);
  const revs = revisionViews(state);
  const progress = subjectProgress(state);
  const habit = consistency(state);
  const today = todayISO();
  const tasks = state.tasks.filter((t) => t.date === today);

  const payload = {
    student: state.settings.displayName,
    now: new Date().toISOString(),
    availableToday: copy,
    remainingMinutes: avail.remainingMin,
    longestWindow: avail.longest,
    backlog: {
      totalLectures: snap.totalLectures,
      total: formatDuration(snap.totalMinutes),
      bySubject: snap.items.map((i) => ({
        subject: i.subject.name,
        lectures: i.lectures.length,
        time: formatDuration(i.minutes),
        oldestDays: i.oldestDays,
      })),
      recovery: recoveryCopy(snap),
    },
    pendingLectures: state.lectures.filter(pendingLike).map((l) => ({
      label: lectureLabel(state, l),
      status: l.status,
      estimatedMin: l.estimatedMin,
      scheduledDate: l.scheduledDate,
      subject: subjectOf(state, l)?.name,
    })),
    todayTasks: tasks.map((t) => ({ title: t.title, done: t.done, durationMin: t.durationMin })),
    revision: revs.map((r) => ({
      label: r.label,
      bucket: r.bucket,
      daysUntil: r.daysUntil,
      confidence: r.item.confidence,
      performance: r.item.performance,
      stale: r.stale,
    })),
    progress,
    consistency: `Studied on ${habit.studied} of the last ${habit.window} days.`,
    timetable: state.blocks.map((b) => ({
      day: b.dayOfWeek,
      start: b.start,
      end: b.end,
      label: b.label,
      kind: b.kind,
    })),
    priorities: "Class 11 JEE. Prefer practical next actions. No motivational fluff.",
  };

  return JSON.stringify(payload, null, 2);
}

export interface AiProvider {
  id: "NVIDIA";
  complete(system: string, user: string, apiKey: string, model: string): Promise<string>;
}

export const nvidiaProvider: AiProvider = {
  id: "NVIDIA",
  async complete(system, user, apiKey, model) {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.25,
        max_tokens: 700,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `NVIDIA API ${res.status}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content?.trim() || "No response.";
  },
};

export function getProvider(id: "NVIDIA"): AiProvider {
  if (id === "NVIDIA") return nvidiaProvider;
  return nvidiaProvider;
}

export async function askLectureAI(state: AppState, question: string): Promise<string> {
  const provider = getProvider(state.settings.aiProvider);
  const key = state.settings.nvidiaApiKey.trim();
  if (!key) {
    throw new Error("Add your NVIDIA API key in Settings.");
  }
  const system = `You are LectureOS, a precise study planner for a Class 11 JEE student.
Use only the structured context. Recommend realistic next work that fits remaining time.
Never be motivational. Never invent lectures. Estimates are estimates.
If a 90-minute lecture does not fit a short window, recommend a shorter revision or DPP instead.`;
  const user = `CONTEXT\n${buildAiContext(state)}\n\nREQUEST\n${question}`;
  return provider.complete(system, user, key, state.settings.nvidiaModel);
}
