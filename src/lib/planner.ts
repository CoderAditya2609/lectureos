import type { AppState, Lecture } from "../types";
import { daysBetween, formatDuration, todayISO } from "./format";
import { pendingLike, chapterOf, lectureLabel, subjectOf } from "./taxonomy";
import { availability } from "./scheduleEngine";
import { revisionViews } from "./revisionEngine";

export interface PlanItem {
  kind: "lecture" | "revision" | "task";
  title: string;
  estimatedMin: number;
  reasons: string[];
  lectureId?: string;
  taskId?: string;
  revisionId?: string;
}

export interface PlanResult {
  availableMin: number;
  primary: PlanItem | null;
  next: PlanItem | null;
  note: string;
}

function lectureAge(lecture: Lecture, today: string): number {
  const from = lecture.scheduledDate ?? lecture.createdAt.slice(0, 10);
  return Math.max(0, daysBetween(from, today));
}

function hasEarlierPending(state: AppState, lecture: Lecture): boolean {
  const chapter = chapterOf(state, lecture);
  if (!chapter) return false;
  const topicIds = new Set(state.topics.filter((t) => t.chapterId === chapter.id).map((t) => t.id));
  return state.lectures.some(
    (l) => topicIds.has(l.topicId) && pendingLike(l) && l.number < lecture.number,
  );
}

export function buildPlan(state: AppState, now = new Date()): PlanResult {
  const today = todayISO(now);
  const avail = availability(state, now);
  const availableMin = avail.remainingMin;
  const usable = avail.realisticMin;

  const doneToday = new Set(
    state.tasks.filter((t) => t.date === today && t.done).map((t) => t.lectureId).filter(Boolean),
  );

  const candidates: PlanItem[] = [];

  for (const lecture of state.lectures.filter(pendingLike)) {
    if (doneToday.has(lecture.id)) continue;
    const age = lectureAge(lecture, today);
    const chapter = chapterOf(state, lecture);
    const subject = subjectOf(state, lecture);
    const reasons: string[] = [];
    let score = 0;
    if (age >= 2) {
      score += age * 6;
      reasons.push(`it is ${age} day${age === 1 ? "" : "s"} behind the batch`);
    }
    if (lecture.status === "missed") {
      score += 18;
      reasons.push("it was marked missed");
    }
    if (hasEarlierPending(state, lecture)) {
      score -= 12;
    } else if (chapter) {
      score += 14;
      reasons.push("the next lecture in this chapter depends on it");
    }
    score += (chapter?.importance ?? 3) * 4;
    const pendingSame = state.lectures.filter(
      (l) => pendingLike(l) && subjectOf(state, l)?.id === subject?.id,
    ).length;
    score += pendingSame;
    reasons.push(`you have ${formatDuration(usable)} usable after buffer`);
    candidates.push({
      kind: "lecture",
      title: lectureLabel(state, lecture),
      estimatedMin: lecture.estimatedMin,
      reasons,
      lectureId: lecture.id,
    });
    (candidates[candidates.length - 1] as PlanItem & { score?: number }).score = score;
  }

  for (const view of revisionViews(state, now)) {
    if (view.bucket !== "due" && view.bucket !== "weak" && view.bucket !== "approaching") continue;
    const reasons = [];
    if (view.stale) reasons.push("this may be becoming stale");
    if (view.bucket === "weak") reasons.push("previous accuracy / confidence was low");
    if (view.daysUntil <= 0) reasons.push("revision is due now");
    candidates.push({
      kind: "revision",
      title: `${view.label} revision`,
      estimatedMin: 25,
      reasons,
      revisionId: view.item.id,
    });
    (candidates[candidates.length - 1] as PlanItem & { score?: number }).score =
      view.bucket === "due" ? 40 : view.bucket === "weak" ? 36 : 22;
  }

  for (const task of state.tasks.filter((t) => t.date === today && !t.done)) {
    candidates.push({
      kind: "task",
      title: task.title,
      estimatedMin: task.durationMin ?? 30,
      reasons: ["it is already on today's list"],
      taskId: task.id,
      lectureId: task.lectureId,
    });
    (candidates[candidates.length - 1] as PlanItem & { score?: number }).score = 28;
  }

  const scored = candidates
    .map((c) => ({ ...c, score: (c as PlanItem & { score?: number }).score ?? 0 }))
    .filter((c) => c.estimatedMin <= Math.max(usable, 20) || usable === 0)
    .sort((a, b) => b.score - a.score);

  const fit = scored.filter((c) => c.estimatedMin <= usable || usable >= c.estimatedMin - 5);
  const pool = fit.length ? fit : scored;

  if (usable < 15) {
    const short = pool.find((c) => c.estimatedMin <= 30) ?? null;
    return {
      availableMin,
      primary: short,
      next: null,
      note:
        availableMin <= 0
          ? "No remaining study window. Wait for the next available block."
          : "Only a short window remains. Prefer a compact revision or DPP over a full lecture.",
    };
  }

  const primary = pool[0] ?? null;
  let remaining = usable - (primary?.estimatedMin ?? 0);
  const next =
    pool.find((c) => c !== primary && c.estimatedMin <= remaining && c.title !== primary?.title) ??
    null;

  return {
    availableMin,
    primary,
    next,
    note: primary
      ? "Practical next step from timetable, backlog age, chapter order, and revision due dates."
      : "Nothing fits the remaining window. Add a short task or wait for the next free block.",
  };
}

export function planToText(plan: PlanResult): string {
  const lines = [`You have ${formatDuration(plan.availableMin)} available.`];
  if (plan.primary) {
    lines.push("", "Recommended:", plan.primary.title, `Estimated: ${plan.primary.estimatedMin} min`);
    if (plan.primary.reasons.length) {
      lines.push("", `${plan.primary.title.split("—")[0].trim()} is recommended first because:`);
      for (const r of plan.primary.reasons.slice(0, 3)) lines.push(`- ${r}`);
    }
  }
  if (plan.next) {
    lines.push("", "Then:", plan.next.title, `Estimated: ${plan.next.estimatedMin} min`);
  }
  lines.push("", plan.note);
  return lines.join("\n");
}
