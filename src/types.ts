export type ID = string;

export type LectureStatus =
  | "upcoming"
  | "pending"
  | "completed"
  | "missed"
  | "needs_revision";

export type TimeKind = "available" | "blocked" | "optional";

export type RouteId =
  | "dashboard"
  | "lectures"
  | "backlog"
  | "taxonomy"
  | "schedule"
  | "revision"
  | "analytics"
  | "ai"
  | "settings";

export type RevisionTarget = "lecture" | "topic" | "chapter";

export interface Subject {
  id: ID;
  name: string;
  order: number;
}

export interface Chapter {
  id: ID;
  subjectId: ID;
  name: string;
  importance: number;
  order: number;
}

export interface Topic {
  id: ID;
  chapterId: ID;
  name: string;
  order: number;
}

export interface Lecture {
  id: ID;
  topicId: ID;
  number: number;
  title: string;
  estimatedMin: number;
  actualMin?: number;
  status: LectureStatus;
  scheduledDate?: string;
  completedDate?: string;
  notes: string;
  tags: string[];
  createdAt: string;
}

export interface DailyTask {
  id: ID;
  date: string;
  title: string;
  lectureId?: ID;
  subjectId?: ID;
  durationMin?: number;
  done: boolean;
  order: number;
}

export interface TimeBlock {
  id: ID;
  dayOfWeek: number;
  start: string;
  end: string;
  label: string;
  kind: TimeKind;
}

export interface RevisionItem {
  id: ID;
  targetType: RevisionTarget;
  targetId: ID;
  lastRevision?: string;
  nextDue: string;
  count: number;
  confidence: number;
  performance?: number;
  mistakes: string[];
}

export interface StudyDay {
  date: string;
  minutes: number;
  tasksCompleted: number;
  lecturesCompleted: number;
}

export interface Settings {
  displayName: string;
  nvidiaApiKey: string;
  nvidiaApiKeyVerified: boolean;
  nvidiaModel: string;
  aiProvider: "NVIDIA";
  bufferPercent: number;
  revisionIntervals: number[];
}

export interface AppState {
  version: 1;
  settings: Settings;
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  lectures: Lecture[];
  tasks: DailyTask[];
  blocks: TimeBlock[];
  revisions: RevisionItem[];
  studyDays: StudyDay[];
}

export const DEFAULT_NVIDIA_MODEL = "nvidia/nvidia-nemotron-nano-9b-v2";
export const DEPRECATED_NVIDIA_MODELS = ["nvidia/llama-3.1-nemotron-70b-instruct"];

export const DEFAULT_SETTINGS: Settings = {
  displayName: "Adi",
  nvidiaApiKey: "",
  nvidiaApiKeyVerified: false,
  nvidiaModel: DEFAULT_NVIDIA_MODEL,
  aiProvider: "NVIDIA",
  bufferPercent: 12,
  revisionIntervals: [1, 7, 21, 45],
};
