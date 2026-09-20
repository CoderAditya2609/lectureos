import type { AppState } from "../types";
import { daysBetween, todayISO } from "./format";
import { pendingLike, subjectOf } from "./taxonomy";

export interface SubjectProgress {
  name: string;
  completed: number;
  total: number;
  pct: number;
}

export function subjectProgress(state: AppState): SubjectProgress[] {
  return [...state.subjects]
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const lectures = state.lectures.filter((l) => subjectOf(state, l)?.id === s.id);
      const completed = lectures.filter((l) => l.status === "completed").length;
      const total = lectures.length;
      return { name: s.name, completed, total, pct: total ? Math.round((completed / total) * 100) : 0 };
    });
}

export function consistency(state: AppState, now = new Date()): { studied: number; window: number } {
  const today = todayISO(now);
  let studied = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = todayISO(d);
    const day = state.studyDays.find((s) => s.date === iso);
    const tasks = state.tasks.some((t) => t.date === iso && t.done);
    const lectures = state.lectures.some((l) => l.completedDate === iso);
    if ((day && day.minutes > 0) || tasks || lectures) studied += 1;
    if (iso === today && !day && !tasks && !lectures) {
      /* today still counts if later */
    }
  }
  return { studied, window: 7 };
}

export function averageDailyMinutes(state: AppState, now = new Date()): number {
  const today = todayISO(now);
  const recent = state.studyDays.filter((d) => daysBetween(d.date, today) <= 14);
  if (!recent.length) return 0;
  return Math.round(recent.reduce((s, d) => s + d.minutes, 0) / recent.length);
}

export function backlogTrend(state: AppState): { label: string; pending: number }[] {
  const today = todayISO();
  const points = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = todayISO(d);
    const pending = state.lectures.filter((l) => {
      if (!pendingLike(l)) {
        if (l.status === "completed" && l.completedDate && l.completedDate > iso) return true;
        return false;
      }
      return l.createdAt.slice(0, 10) <= iso;
    }).length;
    points.push({ label: iso === today ? "Today" : iso.slice(5), pending });
  }
  return points;
}
