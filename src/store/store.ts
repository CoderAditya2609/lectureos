import { useSyncExternalStore } from "react";
import type {
  AppState,
  Chapter,
  DailyTask,
  Lecture,
  LectureStatus,
  Settings,
  Subject,
  TimeBlock,
  Topic,
} from "../types";
import { DEFAULT_SETTINGS, DEPRECATED_NVIDIA_MODELS, DEFAULT_NVIDIA_MODEL } from "../types";
import { seedState } from "./seed";
import { uid, todayISO } from "../lib/format";
import { nextDueFrom } from "../lib/revisionEngine";

const KEY = "lectureos.v1";

function migrateSettings(partial?: Partial<Settings>): Settings {
  const settings = { ...DEFAULT_SETTINGS, ...partial };
  if (DEPRECATED_NVIDIA_MODELS.includes(settings.nvidiaModel)) {
    settings.nvidiaModel = DEFAULT_NVIDIA_MODEL;
    settings.nvidiaApiKeyVerified = false;
  }
  return settings;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== 1) return seedState();
    return { ...parsed, settings: migrateSettings(parsed.settings) };
  } catch {
    return seedState();
  }
}

let state = load();
const listeners = new Set<() => void>();

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function set(next: AppState) {
  state = next;
  persist();
}

function patch(partial: Partial<AppState>) {
  set({ ...state, ...partial });
}

function recordStudy(minutes: number, lectureDone = false) {
  const date = todayISO();
  const existing = state.studyDays.find((d) => d.date === date);
  const studyDays = existing
    ? state.studyDays.map((d) =>
        d.date === date
          ? {
              ...d,
              minutes: d.minutes + minutes,
              tasksCompleted: d.tasksCompleted + 1,
              lecturesCompleted: d.lecturesCompleted + (lectureDone ? 1 : 0),
            }
          : d,
      )
    : [
        ...state.studyDays,
        {
          date,
          minutes,
          tasksCompleted: 1,
          lecturesCompleted: lectureDone ? 1 : 0,
        },
      ];
  patch({ studyDays });
}

export const store = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  resetSeed() {
    set(seedState());
  },
  resetEmpty() {
    localStorage.removeItem(KEY);
    set(seedState());
  },
  clearAll() {
    const settings = state.settings;
    set({
      version: 1,
      settings,
      subjects: [],
      chapters: [],
      topics: [],
      lectures: [],
      tasks: [],
      blocks: [],
      revisions: [],
      studyDays: [],
    });
  },
  updateSettings(settings: Partial<Settings>) {
    const next = { ...state.settings, ...settings };
    if (settings.nvidiaApiKey !== undefined && settings.nvidiaApiKey !== state.settings.nvidiaApiKey) {
      next.nvidiaApiKeyVerified = settings.nvidiaApiKeyVerified ?? false;
    }
    patch({ settings: next });
  },
  addSubject(name: string) {
    const subject: Subject = { id: uid("sub"), name, order: state.subjects.length };
    patch({ subjects: [...state.subjects, subject] });
    return subject;
  },
  renameSubject(id: string, name: string) {
    patch({ subjects: state.subjects.map((s) => (s.id === id ? { ...s, name } : s)) });
  },
  deleteSubject(id: string) {
    const chapterIds = state.chapters.filter((c) => c.subjectId === id).map((c) => c.id);
    const topicIds = state.topics.filter((t) => chapterIds.includes(t.chapterId)).map((t) => t.id);
    patch({
      subjects: state.subjects.filter((s) => s.id !== id),
      chapters: state.chapters.filter((c) => c.subjectId !== id),
      topics: state.topics.filter((t) => !chapterIds.includes(t.chapterId)),
      lectures: state.lectures.filter((l) => !topicIds.includes(l.topicId)),
    });
  },
  addChapter(subjectId: string, name: string) {
    const chapter: Chapter = {
      id: uid("ch"),
      subjectId,
      name,
      importance: 3,
      order: state.chapters.filter((c) => c.subjectId === subjectId).length,
    };
    patch({ chapters: [...state.chapters, chapter] });
    return chapter;
  },
  updateChapter(id: string, data: Partial<Chapter>) {
    patch({ chapters: state.chapters.map((c) => (c.id === id ? { ...c, ...data } : c)) });
  },
  deleteChapter(id: string) {
    const topicIds = state.topics.filter((t) => t.chapterId === id).map((t) => t.id);
    patch({
      chapters: state.chapters.filter((c) => c.id !== id),
      topics: state.topics.filter((t) => t.chapterId !== id),
      lectures: state.lectures.filter((l) => !topicIds.includes(l.topicId)),
    });
  },
  addTopic(chapterId: string, name: string) {
    const topic: Topic = {
      id: uid("tp"),
      chapterId,
      name,
      order: state.topics.filter((t) => t.chapterId === chapterId).length,
    };
    patch({ topics: [...state.topics, topic] });
    return topic;
  },
  renameTopic(id: string, name: string) {
    patch({ topics: state.topics.map((t) => (t.id === id ? { ...t, name } : t)) });
  },
  deleteTopic(id: string) {
    patch({
      topics: state.topics.filter((t) => t.id !== id),
      lectures: state.lectures.filter((l) => l.topicId !== id),
    });
  },
  addLecture(data: Omit<Lecture, "id" | "createdAt">) {
    const lecture: Lecture = { ...data, id: uid("lec"), createdAt: new Date().toISOString() };
    patch({ lectures: [...state.lectures, lecture] });
    return lecture;
  },
  updateLecture(id: string, data: Partial<Lecture>) {
    patch({ lectures: state.lectures.map((l) => (l.id === id ? { ...l, ...data } : l)) });
  },
  setLectureStatus(id: string, status: LectureStatus, opts?: { logStudy?: boolean }) {
    const lecture = state.lectures.find((l) => l.id === id);
    if (!lecture) return;
    const completedDate = status === "completed" ? todayISO() : lecture.completedDate;
    const lectures = state.lectures.map((l) => (l.id === id ? { ...l, status, completedDate } : l));
    let revisions = state.revisions;
    if (status === "completed" && !revisions.some((r) => r.targetId === id)) {
      const last = todayISO();
      revisions = [
        ...revisions,
        {
          id: uid("rev"),
          targetType: "lecture",
          targetId: id,
          lastRevision: last,
          nextDue: nextDueFrom(last, 0, state.settings.revisionIntervals),
          count: 0,
          confidence: 3,
          mistakes: [],
        },
      ];
    }
    patch({ lectures, revisions });
    if (status === "completed" && opts?.logStudy !== false) {
      recordStudy(lecture.actualMin ?? lecture.estimatedMin, true);
    }
  },
  deleteLecture(id: string) {
    patch({
      lectures: state.lectures.filter((l) => l.id !== id),
      tasks: state.tasks.filter((t) => t.lectureId !== id),
      revisions: state.revisions.filter((r) => r.targetId !== id),
    });
  },
  addTask(partial: Partial<DailyTask> & { title: string }) {
    const date = partial.date ?? todayISO();
    const task: DailyTask = {
      id: uid("tsk"),
      date,
      title: partial.title,
      lectureId: partial.lectureId,
      subjectId: partial.subjectId,
      durationMin: partial.durationMin,
      done: false,
      order: state.tasks.filter((t) => t.date === date).length,
    };
    patch({ tasks: [...state.tasks, task] });
  },
  updateTask(id: string, data: Partial<DailyTask>) {
    patch({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)) });
  },
  toggleTask(id: string) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    const done = !task.done;
    store.updateTask(id, { done });
    if (done) {
      if (task.lectureId) store.setLectureStatus(task.lectureId, "completed");
      else recordStudy(task.durationMin ?? 25, false);
    }
  },
  deleteTask(id: string) {
    patch({ tasks: state.tasks.filter((t) => t.id !== id) });
  },
  reorderTasks(date: string, fromId: string, toId: string) {
    const list = state.tasks.filter((t) => t.date === date).sort((a, b) => a.order - b.order);
    const from = list.findIndex((t) => t.id === fromId);
    const to = list.findIndex((t) => t.id === toId);
    if (from < 0 || to < 0) return;
    const copy = [...list];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    const others = state.tasks.filter((t) => t.date !== date);
    patch({
      tasks: [...others, ...copy.map((t, i) => ({ ...t, order: i }))],
    });
  },
  addBlock(block: Omit<TimeBlock, "id">) {
    patch({ blocks: [...state.blocks, { ...block, id: uid("blk") }] });
  },
  updateBlock(id: string, data: Partial<TimeBlock>) {
    patch({ blocks: state.blocks.map((b) => (b.id === id ? { ...b, ...data } : b)) });
  },
  deleteBlock(id: string) {
    patch({ blocks: state.blocks.filter((b) => b.id !== id) });
  },
  copyDay(from: number, to: number) {
    const source = state.blocks.filter((b) => b.dayOfWeek === from);
    const rest = state.blocks.filter((b) => b.dayOfWeek !== to);
    patch({
      blocks: [
        ...rest,
        ...source.map((b) => ({ ...b, id: uid("blk"), dayOfWeek: to })),
      ],
    });
  },
  markRevision(id: string, confidence: number, performance?: number) {
    const intervals = state.settings.revisionIntervals;
    patch({
      revisions: state.revisions.map((r) => {
        if (r.id !== id) return r;
        const last = todayISO();
        const count = r.count + 1;
        return {
          ...r,
          lastRevision: last,
          count,
          confidence,
          performance,
          nextDue: nextDueFrom(last, count, intervals),
        };
      }),
    });
    recordStudy(20, false);
  },
  addRevisionMistake(id: string, text: string) {
    patch({
      revisions: state.revisions.map((r) =>
        r.id === id ? { ...r, mistakes: [...r.mistakes, text] } : r,
      ),
    });
  },
};

export function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
