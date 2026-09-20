import type { AppState } from "../types";
import { DEFAULT_NVIDIA_MODEL, DEPRECATED_NVIDIA_MODELS } from "../types";
import { store } from "../store/store";
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

const NVIDIA_API = "/nvidia-api";

export function normalizeNvidiaKey(raw: string): string {
  return raw.trim().replace(/^Bearer\s+/i, "");
}

export function resolveNvidiaModel(model: string): string {
  if (!model.trim() || DEPRECATED_NVIDIA_MODELS.includes(model)) return DEFAULT_NVIDIA_MODEL;
  return model;
}

async function nvidiaError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text) as { detail?: string; message?: string; title?: string; error?: { message?: string } };
    return json.detail || json.error?.message || json.message || json.title || text || `NVIDIA API ${res.status}`;
  } catch {
    return text || `NVIDIA API ${res.status}`;
  }
}

async function nvidiaFetch(path: string, apiKey: string, init?: RequestInit): Promise<Response> {
  return fetch(`${NVIDIA_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
  });
}

export interface NvidiaVerifyResult {
  ok: boolean;
  message: string;
  model: string;
}

export async function verifyNvidiaApiKey(apiKey: string, model: string, retried = false): Promise<NvidiaVerifyResult> {
  const key = normalizeNvidiaKey(apiKey);
  if (!key) {
    return { ok: false, message: "Paste an NVIDIA API key first.", model };
  }

  let resolved = resolveNvidiaModel(model);
  const modelsRes = await nvidiaFetch("/v1/models", key);
  if (modelsRes.status === 401 || modelsRes.status === 403) {
    return {
      ok: false,
      message: "NVIDIA rejected this key. Create a new one at build.nvidia.com and paste it here.",
      model: resolved,
    };
  }

  if (modelsRes.ok) {
    const catalog = (await modelsRes.json()) as { data?: { id?: string }[] };
    const ids = (catalog.data ?? []).map((m) => m.id).filter(Boolean) as string[];
    if (ids.length && !ids.includes(resolved)) {
      resolved =
        ids.find((id) => id === DEFAULT_NVIDIA_MODEL) ??
        ids.find((id) => /nemotron/i.test(id) && /instruct|nano|super/i.test(id)) ??
        ids[0];
    }
  }

  const ping = await nvidiaFetch("/v1/chat/completions", key, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: resolved,
      messages: [{ role: "user", content: "Reply with the single word ok." }],
      temperature: 0,
      max_tokens: 8,
    }),
  });

  if (!ping.ok) {
    const detail = await nvidiaError(ping);
    if (ping.status === 404 && !retried && resolved !== DEFAULT_NVIDIA_MODEL) {
      return verifyNvidiaApiKey(key, DEFAULT_NVIDIA_MODEL, true);
    }
    return {
      ok: false,
      message: `Key reached NVIDIA, but the model failed: ${detail}`,
      model: resolved,
    };
  }

  const switched = resolved !== model;
  return {
    ok: true,
    message: switched
      ? `Key works. Hosted model is now ${resolved} (the previous id is no longer served).`
      : `Key works with ${resolved}.`,
    model: resolved,
  };
}

export interface AiProvider {
  id: "NVIDIA";
  complete(system: string, user: string, apiKey: string, model: string): Promise<string>;
}

export const nvidiaProvider: AiProvider = {
  id: "NVIDIA",
  async complete(system, user, apiKey, model) {
    const res = await nvidiaFetch("/v1/chat/completions", apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      throw new Error(await nvidiaError(res));
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
  const key = normalizeNvidiaKey(state.settings.nvidiaApiKey);
  if (!key) {
    throw new Error("Add your NVIDIA API key in Settings, then verify it.");
  }

  let model = resolveNvidiaModel(state.settings.nvidiaModel);
  if (!state.settings.nvidiaApiKeyVerified || model !== state.settings.nvidiaModel) {
    const check = await verifyNvidiaApiKey(key, model);
    store.updateSettings({
      nvidiaApiKey: key,
      nvidiaApiKeyVerified: check.ok,
      nvidiaModel: check.model,
    });
    if (!check.ok) {
      throw new Error(`${check.message} Verify the key in Settings.`);
    }
    model = check.model;
  }

  const system = `You are LectureOS, a precise study planner for a Class 11 JEE student.
Use only the structured context. Recommend realistic next work that fits remaining time.
Never be motivational. Never invent lectures. Estimates are estimates.
If a 90-minute lecture does not fit a short window, recommend a shorter revision or DPP instead.`;
  const user = `CONTEXT\n${buildAiContext(state)}\n\nREQUEST\n${question}`;
  return provider.complete(system, user, key, model);
}
