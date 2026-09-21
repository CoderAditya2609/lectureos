import type { AppState } from "../types";
import { revisionViews } from "./revisionEngine";
import { backlogSnapshot } from "./backlogEngine";
import { chapterOf, lectureLabel } from "./taxonomy";

export interface Insight {
  id: string;
  kicker: string;
  title: string;
  action: string;
  cta: string;
  route?: "revision" | "backlog" | "lectures" | "taxonomy" | "settings";
  lectureId?: string;
  revisionId?: string;
}

export function localInsights(state: AppState): Insight[] {
  const out: Insight[] = [];
  const revs = revisionViews(state);
  const stale = revs.filter((r) => r.stale || r.bucket === "due");
  const firstStale = stale[0];
  if (firstStale) {
    const lecture = state.lectures.find((l) => l.id === firstStale.item.targetId);
    const chapter = lecture ? chapterOf(state, lecture)?.name : firstStale.chapter;
    out.push({
      id: `rev-${firstStale.item.id}`,
      kicker: "AI insight",
      title: chapter
        ? `Your ${chapter} chapter has not been revised recently.`
        : `${firstStale.label} is due for revision.`,
      action: "Review notes → DPP → Mistake review",
      cta: "Start revision",
      route: "revision",
      revisionId: firstStale.item.id,
    });
  }

  const snap = backlogSnapshot(state);
  const oldest = [...snap.items].sort((a, b) => b.oldestDays - a.oldestDays)[0];
  if (oldest && oldest.oldestDays >= 3 && oldest.lectures[0]) {
    const lecture = oldest.lectures[0];
    out.push({
      id: `back-${oldest.subject.id}`,
      kicker: "Backlog",
      title: `${oldest.subject.name} has ${oldest.lectures.length} lectures waiting · oldest ${oldest.oldestDays}d.`,
      action: lectureLabel(state, lecture),
      cta: "Open backlog",
      route: "backlog",
      lectureId: lecture.id,
    });
  }

  if (!state.lectures.length) {
    out.push({
      id: "empty-map",
      kicker: "Get started",
      title: "No lectures yet.",
      action: "Add your current batch syllabus to start building your Lecture OS.",
      cta: "Add syllabus",
      route: "taxonomy",
    });
  }

  return out.slice(0, 2);
}

export function navigateLectureOs(route: string) {
  window.dispatchEvent(new CustomEvent("lectureos:navigate", { detail: route }));
}
