import type { AppState, Chapter, Lecture, Subject, Topic } from "../types";

export function subjectOf(state: AppState, lecture: Lecture): Subject | undefined {
  const topic = state.topics.find((t) => t.id === lecture.topicId);
  const chapter = topic ? state.chapters.find((c) => c.id === topic.chapterId) : undefined;
  return chapter ? state.subjects.find((s) => s.id === chapter.subjectId) : undefined;
}

export function chapterOf(state: AppState, lecture: Lecture): Chapter | undefined {
  const topic = state.topics.find((t) => t.id === lecture.topicId);
  return topic ? state.chapters.find((c) => c.id === topic.chapterId) : undefined;
}

export function topicOf(state: AppState, lecture: Lecture): Topic | undefined {
  return state.topics.find((t) => t.id === lecture.topicId);
}

export function lectureLabel(state: AppState, lecture: Lecture): string {
  const subject = subjectOf(state, lecture)?.name ?? "Lecture";
  const chapter = chapterOf(state, lecture)?.name ?? "";
  return `${subject} — ${chapter} L${lecture.number}`;
}

export function lecturesForTopic(state: AppState, topicId: string): Lecture[] {
  return state.lectures
    .filter((l) => l.topicId === topicId)
    .sort((a, b) => a.number - b.number);
}

export function pendingLike(l: Lecture): boolean {
  return l.status === "pending" || l.status === "missed" || l.status === "needs_revision";
}
