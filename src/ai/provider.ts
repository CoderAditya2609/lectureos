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
    usableMinutes: avail.realisticMin,
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

/**
 * BYOK: the NVIDIA key is stored in localStorage and sent from the browser
 * through a same-origin `/nvidia-api` proxy (Vite in dev, Vercel Edge in prod)
 * so the key is not baked into the bundle. Device access can still read storage.
 */
const NVIDIA_PROXY = "/nvidia-api";
const NVIDIA_HOST = "https://integrate.api.nvidia.com";

export type NvidiaVerifyCode = "ok" | "empty" | "invalid_key" | "quota" | "model" | "network" | "unknown";

export interface NvidiaVerifyResult {
  ok: boolean;
  code: NvidiaVerifyCode;
  message: string;
  model: string;
  provider: "NVIDIA";
  latencyMs?: number;
}

export function normalizeNvidiaKey(raw: string): string {
  return raw.trim().replace(/^Bearer\s+/i, "");
}

export function maskApiKey(raw: string): string {
  const key = normalizeNvidiaKey(raw);
  if (!key) return "";
  const tail = key.slice(-4);
  return `${"•".repeat(Math.max(8, key.length - 4))}${tail}`;
}

export function resolveNvidiaModel(model: string): string {
  if (!model.trim() || DEPRECATED_NVIDIA_MODELS.includes(model)) return DEFAULT_NVIDIA_MODEL;
  return model;
}

function redactKey(text: string, key: string): string {
  if (!key || key.length < 8) return text;
  return text.split(key).join(maskApiKey(key));
}

async function readErrorBody(res: Response, key: string): Promise<string> {
  const text = redactKey(await res.text(), key);
  try {
    const json = JSON.parse(text) as {
      detail?: string;
      message?: string;
      title?: string;
      error?: { message?: string };
    };
    return json.detail || json.error?.message || json.message || json.title || text || `NVIDIA API ${res.status}`;
  } catch {
    if (/<!doctype html/i.test(text)) {
      return "Lecture OS reached the web app instead of NVIDIA. The API proxy is missing.";
    }
    return text.slice(0, 280) || `NVIDIA API ${res.status}`;
  }
}

function classifyStatus(status: number, detail: string): NvidiaVerifyCode {
  if (status === 401 || status === 403) return "invalid_key";
  if (status === 429 || status === 402) return "quota";
  if (status === 404 || status === 422) return "model";
  if (status === 502 || status === 503 || status === 504 || status === 0) return "network";
  const lower = detail.toLowerCase();
  if (/invalid.?api.?key|unauthorized|authentication|api key/i.test(lower)) return "invalid_key";
  if (/quota|rate.?limit|too many requests|billing|exceeded/i.test(lower)) return "quota";
  if (/model|not found|does not exist|unknown model|unavailable/i.test(lower)) return "model";
  if (status >= 500) return "network";
  return "unknown";
}

function messageFor(code: NvidiaVerifyCode, detail: string, model: string): string {
  switch (code) {
    case "empty":
      return "Paste an NVIDIA API key first.";
    case "invalid_key":
      return "NVIDIA rejected this API key. Create a new one at build.nvidia.com and paste it here.";
    case "quota":
      return "The key may be valid, but NVIDIA rejected the request because of quota or rate limits. Wait a moment or check your NVIDIA account.";
    case "model":
      return `The selected model is unavailable or incorrectly configured (${model}). ${detail}`.trim();
    case "network":
      return `Lecture OS could not reach the NVIDIA AI service. ${detail}`.trim();
    case "ok":
      return `Connected to NVIDIA AI · ${model}`;
    default:
      return detail || "NVIDIA returned an unexpected error. Check Settings and try again.";
  }
}

async function nvidiaFetch(path: string, apiKey: string, init?: RequestInit): Promise<Response> {
  const bases = import.meta.env.DEV ? [NVIDIA_PROXY, NVIDIA_HOST] : [NVIDIA_PROXY, NVIDIA_HOST];
  let lastError: unknown;
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          ...(init?.headers ?? {}),
        },
      });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.includes("text/html")) {
        lastError = new Error("proxy-html");
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  const reason = lastError instanceof Error ? lastError.message : "network";
  throw Object.assign(new Error(reason), { code: "network" as const });
}

function chatBody(model: string, messages: { role: string; content: string }[], extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    model,
    messages,
    temperature: extra.temperature ?? 0.25,
    max_tokens: extra.max_tokens ?? 700,
    stream: extra.stream ?? false,
  });
}

export async function verifyNvidiaApiKey(apiKey: string, model: string, retried = false): Promise<NvidiaVerifyResult> {
  const key = normalizeNvidiaKey(apiKey);
  const resolved0 = resolveNvidiaModel(model);
  if (!key) {
    return { ok: false, code: "empty", message: messageFor("empty", "", resolved0), model: resolved0, provider: "NVIDIA" };
  }

  let resolved = resolved0;
  const started = performance.now();

  try {
    const modelsRes = await nvidiaFetch("/v1/models", key);
    if (modelsRes.status === 401 || modelsRes.status === 403) {
      const detail = await readErrorBody(modelsRes, key);
      if (import.meta.env.DEV) console.warn("[nvidia verify]", modelsRes.status, detail);
      return {
        ok: false,
        code: "invalid_key",
        message: messageFor("invalid_key", detail, resolved),
        model: resolved,
        provider: "NVIDIA",
        latencyMs: Math.round(performance.now() - started),
      };
    }

    if (modelsRes.ok) {
      const type = modelsRes.headers.get("content-type") ?? "";
      if (type.includes("application/json")) {
        const catalog = (await modelsRes.json()) as { data?: { id?: string }[] };
        const ids = (catalog.data ?? []).map((m) => m.id).filter(Boolean) as string[];
        if (ids.length && !ids.includes(resolved)) {
          resolved =
            ids.find((id) => id === DEFAULT_NVIDIA_MODEL) ??
            ids.find((id) => /nemotron/i.test(id) && /nano|instruct|super/i.test(id)) ??
            ids[0];
        }
      }
    }

    const ping = await nvidiaFetch("/v1/chat/completions", key, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: chatBody(
        resolved,
        [
          { role: "system", content: "/no_think" },
          { role: "user", content: "Reply with the single word ok." },
        ],
        { temperature: 0, max_tokens: 16, stream: false },
      ),
    });

    const latencyMs = Math.round(performance.now() - started);

    if (!ping.ok) {
      const detail = await readErrorBody(ping, key);
      if (import.meta.env.DEV) console.warn("[nvidia verify]", ping.status, detail);
      if ((ping.status === 404 || ping.status === 422) && !retried && resolved !== DEFAULT_NVIDIA_MODEL) {
        return verifyNvidiaApiKey(key, DEFAULT_NVIDIA_MODEL, true);
      }
      const code = classifyStatus(ping.status, detail);
      return { ok: false, code, message: messageFor(code, detail, resolved), model: resolved, provider: "NVIDIA", latencyMs };
    }

    return {
      ok: true,
      code: "ok",
      message:
        resolved !== model
          ? `Connected. Hosted model is now ${resolved} (the previous id is no longer served).`
          : `Connected to NVIDIA AI · ${resolved}`,
      model: resolved,
      provider: "NVIDIA",
      latencyMs,
    };
  } catch (err) {
    const detail = err instanceof Error ? redactKey(err.message, key) : "unknown";
    if (import.meta.env.DEV) console.warn("[nvidia verify]", detail);
    const network = /fetch|network|failed|proxy-html|load/i.test(detail);
    const code: NvidiaVerifyCode = network ? "network" : "unknown";
    return {
      ok: false,
      code,
      message: messageFor(code, detail, resolved),
      model: resolved,
      provider: "NVIDIA",
      latencyMs: Math.round(performance.now() - started),
    };
  }
}

export interface AiProvider {
  id: "NVIDIA";
  complete(
    system: string,
    user: string,
    apiKey: string,
    model: string,
    onDelta?: (chunk: string) => void,
  ): Promise<string>;
}

async function readChatResponse(res: Response, apiKey: string, onDelta?: (chunk: string) => void): Promise<string> {
  if (!res.ok) throw new Error(await readErrorBody(res, apiKey));
  if (!onDelta || !res.body) {
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() || "No response.";
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
        const piece = json.choices?.[0]?.delta?.content;
        if (piece) {
          full += piece;
          onDelta(piece);
        }
      } catch {
        /* ignore malformed SSE line */
      }
    }
  }
  return full.trim() || "No response.";
}

export const nvidiaProvider: AiProvider = {
  id: "NVIDIA",
  async complete(system, user, apiKey, model, onDelta) {
    const stream = Boolean(onDelta);
    const res = await nvidiaFetch("/v1/chat/completions", apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: chatBody(
        model,
        [
          { role: "system", content: `${system}\n/no_think` },
          { role: "user", content: user },
        ],
        { temperature: 0.25, max_tokens: 700, stream },
      ),
    });
    return readChatResponse(res, apiKey, onDelta);
  },
};

export function getProvider(id: "NVIDIA"): AiProvider {
  if (id === "NVIDIA") return nvidiaProvider;
  return nvidiaProvider;
}

export async function askLectureAI(
  state: AppState,
  question: string,
  onDelta?: (chunk: string) => void,
): Promise<string> {
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
      throw new Error(`${check.message} Open AI Settings to retry.`);
    }
    model = check.model;
  }

  const system = `You are LectureOS, a precise study planner for a Class 11 JEE student.
Use only the structured context. Recommend realistic next work that fits remaining time.
Never be motivational. Never invent lectures. Estimates are estimates.
If a 90-minute lecture does not fit a short window, recommend a shorter revision or DPP instead.`;
  const user = `CONTEXT\n${buildAiContext(state)}\n\nREQUEST\n${question}`;
  return provider.complete(system, user, key, model, onDelta);
}
