import type { AppState, Lecture, Subject } from "../types";
import { daysBetween, formatDuration, todayISO } from "./format";
import { pendingLike, subjectOf } from "./taxonomy";
import { availability } from "./scheduleEngine";

export interface SubjectBacklog {
  subject: Subject;
  lectures: Lecture[];
  minutes: number;
  oldestDays: number;
}

export interface BacklogSnapshot {
  items: SubjectBacklog[];
  totalLectures: number;
  totalMinutes: number;
  oldestDays: number;
  clearedToday: number;
  clearedWeek: number;
  clearedMonth: number;
  growthWeek: number;
  recoveryDays: { low: number; high: number } | null;
}

function ageDays(lecture: Lecture, today: string): number {
  const from = lecture.scheduledDate ?? lecture.createdAt.slice(0, 10);
  return Math.max(0, daysBetween(from, today));
}

export function backlogSnapshot(state: AppState, now = new Date()): BacklogSnapshot {
  const today = todayISO(now);
  const pending = state.lectures.filter(pendingLike);

  const bySubject = new Map<string, SubjectBacklog>();
  for (const lecture of pending) {
    const subject = subjectOf(state, lecture);
    if (!subject) continue;
    const current = bySubject.get(subject.id) ?? {
      subject,
      lectures: [],
      minutes: 0,
      oldestDays: 0,
    };
    current.lectures.push(lecture);
    current.minutes += lecture.estimatedMin;
    current.oldestDays = Math.max(current.oldestDays, ageDays(lecture, today));
    bySubject.set(subject.id, current);
  }

  const items = [...bySubject.values()].sort((a, b) => b.minutes - a.minutes);
  const totalLectures = pending.length;
  const totalMinutes = pending.reduce((s, l) => s + l.estimatedMin, 0);
  const oldestDays = items.reduce((m, i) => Math.max(m, i.oldestDays), 0);

  const completed = state.lectures.filter((l) => l.status === "completed" && l.completedDate);
  const clearedToday = completed.filter((l) => l.completedDate === today).length;
  const clearedWeek = completed.filter((l) => daysBetween(l.completedDate!, today) <= 7).length;
  const clearedMonth = completed.filter((l) => daysBetween(l.completedDate!, today) <= 30).length;

  const createdThisWeek = state.lectures.filter(
    (l) => daysBetween(l.createdAt.slice(0, 10), today) <= 7 && pendingLike(l),
  ).length;
  const growthWeek = createdThisWeek - clearedWeek;

  const avail = availability(state, now);
  const daily = Math.max(60, avail.realisticMin || Math.round(avail.freeMin * 0.7) || 180);
  const recoveryDays =
    totalMinutes === 0
      ? null
      : {
          low: Math.max(1, Math.floor(totalMinutes / daily)),
          high: Math.max(1, Math.ceil(totalMinutes / Math.max(45, daily * 0.75))),
        };

  return {
    items,
    totalLectures,
    totalMinutes,
    oldestDays,
    clearedToday,
    clearedWeek,
    clearedMonth,
    growthWeek,
    recoveryDays,
  };
}

export function recoveryCopy(snap: BacklogSnapshot): string {
  if (!snap.recoveryDays) return "No backlog to recover.";
  const { low, high } = snap.recoveryDays;
  if (low === high) {
    return `At your current available schedule: approximately ${low} study day${low === 1 ? "" : "s"} to clear this backlog. Estimate only.`;
  }
  return `At your current available schedule: approximately ${low}–${high} study days to clear this backlog. Estimate only.`;
}

export function formatBacklogHours(minutes: number): string {
  return formatDuration(minutes);
}
