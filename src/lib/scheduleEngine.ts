import type { AppState, TimeBlock, TimeKind } from "../types";
import { formatClock, formatDuration, parseMinutes, todayISO } from "./format";

export interface WindowInfo {
  start: string;
  end: string;
  kind: TimeKind;
  minutes: number;
  remaining: number;
}

export interface DayAvailability {
  freeMin: number;
  realisticMin: number;
  remainingMin: number;
  longest: WindowInfo | null;
  windows: WindowInfo[];
}

/** Blocks that end at or after midnight (e.g. 21:00–00:00) are 3h, not zero. */
export function blockSpan(startHHMM: string, endHHMM: string): { start: number; end: number } {
  const start = parseMinutes(startHHMM);
  let end = parseMinutes(endHHMM);
  if (end <= start) end += 24 * 60;
  return { start, end };
}

function overlapRemaining(start: number, end: number, now: number): number {
  let t = now;
  if (end > 24 * 60 && t < start - 12 * 60) t += 24 * 60;
  if (t >= end) return 0;
  const from = Math.max(start, t);
  return Math.max(0, end - from);
}

export function blocksForDay(state: AppState, dayOfWeek: number): TimeBlock[] {
  return state.blocks
    .filter((b) => b.dayOfWeek === dayOfWeek)
    .sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start));
}

export function availability(state: AppState, date = new Date()): DayAvailability {
  const day = date.getDay();
  const nowMin = date.getHours() * 60 + date.getMinutes();
  const isToday = todayISO(date) === todayISO(new Date());
  const blocks = blocksForDay(state, day).filter((b) => b.kind !== "blocked");
  const efficiency = 1 - Math.min(40, Math.max(0, state.settings.bufferPercent)) / 100;

  const windows: WindowInfo[] = blocks.map((b) => {
    const { start, end } = blockSpan(b.start, b.end);
    const minutes = Math.max(0, end - start);
    const remaining = isToday ? overlapRemaining(start, end, nowMin) : minutes;
    return { start: b.start, end: b.end, kind: b.kind, minutes, remaining };
  });

  let wrapFromYesterday = 0;
  if (isToday) {
    const yesterday = (day + 6) % 7;
    for (const b of blocksForDay(state, yesterday).filter((x) => x.kind !== "blocked")) {
      const span = blockSpan(b.start, b.end);
      if (span.end <= 24 * 60) continue;
      const endToday = span.end - 24 * 60;
      wrapFromYesterday += Math.max(0, endToday - nowMin);
    }
  }

  const freeMin = windows.reduce((s, w) => s + w.minutes, 0);
  const remainingRaw = windows.reduce((s, w) => s + w.remaining, 0) + wrapFromYesterday;
  const remainingMin = Math.round(remainingRaw);
  const realisticMin = Math.round(remainingRaw * efficiency);
  const open = windows.filter((w) => w.remaining > 0);
  const longest =
    [...open].sort((a, b) => b.remaining - a.remaining)[0] ??
    [...windows].sort((a, b) => b.minutes - a.minutes)[0] ??
    null;

  return { freeMin, realisticMin, remainingMin, longest, windows };
}

export function availabilityCopy(info: DayAvailability): { total: string; window: string } {
  const total = formatDuration(info.remainingMin);
  if (!info.longest || info.remainingMin <= 0) {
    return { total, window: "No open study window remaining." };
  }
  return {
    total,
    window: `Best window: ${formatClock(info.longest.start)} – ${formatClock(info.longest.end)}`,
  };
}
