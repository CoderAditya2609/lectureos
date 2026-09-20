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

function overlapRemaining(start: number, end: number, now: number): number {
  if (now >= end) return 0;
  const from = Math.max(start, now);
  return Math.max(0, end - from);
}

export function blocksForDay(state: AppState, dayOfWeek: number): TimeBlock[] {
  return state.blocks
    .filter((b) => b.dayOfWeek === dayOfWeek)
    .sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start));
}

export function availability(
  state: AppState,
  date = new Date(),
): DayAvailability {
  const day = date.getDay();
  const nowMin = date.getHours() * 60 + date.getMinutes();
  const isToday = todayISO(date) === todayISO(new Date());
  const blocks = blocksForDay(state, day).filter((b) => b.kind !== "blocked");
  const buffer = 1 - state.settings.bufferPercent / 100;

  const windows: WindowInfo[] = blocks.map((b) => {
    const start = parseMinutes(b.start);
    const end = parseMinutes(b.end);
    const minutes = Math.max(0, end - start);
    const remaining = isToday ? overlapRemaining(start, end, nowMin) : minutes;
    return { start: b.start, end: b.end, kind: b.kind, minutes, remaining };
  });

  const freeMin = windows.reduce((s, w) => s + w.minutes, 0);
  const remainingRaw = windows.reduce((s, w) => s + w.remaining, 0);
  const remainingMin = Math.round(remainingRaw * buffer);
  const realisticMin = Math.round(freeMin * buffer * 0.85);
  const longest =
    windows
      .filter((w) => w.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining)[0] ??
    windows.sort((a, b) => b.minutes - a.minutes)[0] ??
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
