import type { AppState, RevisionItem } from "../types";
import { daysBetween, todayISO } from "./format";
import { chapterOf, lectureLabel, subjectOf } from "./taxonomy";

export type RevisionBucket = "due" | "approaching" | "fresh" | "weak";

export interface RevisionView {
  item: RevisionItem;
  label: string;
  subject: string;
  chapter: string;
  bucket: RevisionBucket;
  daysUntil: number;
  stale: boolean;
}

export function nextDueFrom(lastISO: string, count: number, intervals: number[]): string {
  const idx = Math.min(count, intervals.length - 1);
  const days = intervals[idx] ?? 21;
  const d = new Date(`${lastISO}T12:00:00`);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function classify(item: RevisionItem, today: string): RevisionBucket {
  const until = daysBetween(today, item.nextDue);
  const weak = (item.performance ?? 100) < 60 || item.confidence <= 2;
  if (weak && until <= 7) return "weak";
  if (until <= 0) return "due";
  if (until <= 3) return "approaching";
  return "fresh";
}

export function revisionViews(state: AppState, now = new Date()): RevisionView[] {
  const today = todayISO(now);
  return state.revisions.map((item) => {
    const lecture = state.lectures.find((l) => l.id === item.targetId);
    const label = lecture
      ? lectureLabel(state, lecture)
      : state.chapters.find((c) => c.id === item.targetId)?.name ??
        state.topics.find((t) => t.id === item.targetId)?.name ??
        "Revision";
    const subject = lecture
      ? subjectOf(state, lecture)?.name ?? ""
      : state.subjects.find((s) => s.id === state.chapters.find((c) => c.id === item.targetId)?.subjectId)?.name ?? "";
    const chapter = lecture ? chapterOf(state, lecture)?.name ?? "" : "";
    const bucket = classify(item, today);
    const daysUntil = daysBetween(today, item.nextDue);
    const last = item.lastRevision ?? today;
    const stale = daysBetween(last, today) >= 21;
    return { item, label, subject, chapter, bucket, daysUntil, stale };
  });
}
