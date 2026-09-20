import type { AppState, Lecture } from "../types";
import { uid, todayISO, addDays } from "../lib/format";
import { DEFAULT_SETTINGS } from "../types";

function block(
  day: number,
  start: string,
  end: string,
  label: string,
  kind: "available" | "blocked" | "optional",
) {
  return { id: uid("blk"), dayOfWeek: day, start, end, label, kind };
}

function weekdayTemplate() {
  const days = [1, 2, 3, 4, 5];
  return days.flatMap((d) => [
    block(d, "06:00", "13:00", "School", "blocked"),
    block(d, "13:00", "14:00", "Travel / lunch", "blocked"),
    block(d, "14:00", "16:00", "Free", "available"),
    block(d, "16:00", "20:00", "Coaching", "blocked"),
    block(d, "20:00", "21:00", "Dinner", "blocked"),
    block(d, "21:00", "23:30", "Free", "available"),
  ]);
}

function weekendTemplate() {
  return [0, 6].flatMap((d) => [
    block(d, "07:00", "09:00", "Sleep-in / chores", "blocked"),
    block(d, "09:00", "13:00", "Free", "available"),
    block(d, "13:00", "14:30", "Lunch", "blocked"),
    block(d, "14:30", "18:00", "Free", "available"),
    block(d, "18:00", "19:30", "Optional break", "optional"),
    block(d, "19:30", "22:30", "Free", "available"),
  ]);
}

export function seedState(): AppState {
  const physics = { id: uid("sub"), name: "Physics", order: 0 };
  const chem = { id: uid("sub"), name: "Chemistry", order: 1 };
  const maths = { id: uid("sub"), name: "Maths", order: 2 };

  const circ = { id: uid("ch"), subjectId: physics.id, name: "Circular Motion", importance: 5, order: 0 };
  const lom = { id: uid("ch"), subjectId: physics.id, name: "Laws of Motion", importance: 4, order: 1 };
  const bond = { id: uid("ch"), subjectId: chem.id, name: "Chemical Bonding", importance: 5, order: 0 };
  const goc = { id: uid("ch"), subjectId: chem.id, name: "GOC", importance: 4, order: 1 };
  const pnc = { id: uid("ch"), subjectId: maths.id, name: "PNC", importance: 4, order: 0 };
  const seq = { id: uid("ch"), subjectId: maths.id, name: "Sequences & Series", importance: 3, order: 1 };

  const ang = { id: uid("tp"), chapterId: circ.id, name: "Angular Variables", order: 0 };
  const cent = { id: uid("tp"), chapterId: circ.id, name: "Centripetal Force", order: 1 };
  const n2 = { id: uid("tp"), chapterId: lom.id, name: "Newton II applications", order: 0 };
  const hybrid = { id: uid("tp"), chapterId: bond.id, name: "Hybridisation", order: 0 };
  const vbt = { id: uid("tp"), chapterId: bond.id, name: "VBT / MOT", order: 1 };
  const inductive = { id: uid("tp"), chapterId: goc.id, name: "Electronic effects", order: 0 };
  const perm = { id: uid("tp"), chapterId: pnc.id, name: "Permutations", order: 0 };
  const ap = { id: uid("tp"), chapterId: seq.id, name: "AP / GP", order: 0 };

  const today = todayISO();
  const mk = (
    topicId: string,
    number: number,
    title: string,
    estimatedMin: number,
    status: Lecture["status"],
    extra: Partial<Lecture> = {},
  ): Lecture => ({
    id: uid("lec"),
    topicId,
    number,
    title,
    estimatedMin,
    status,
    notes: "",
    tags: [],
    createdAt: `${addDays(today, extra.scheduledDate ? 0 : -8)}T10:00:00.000Z`,
    ...extra,
  });

  const lectures: Lecture[] = [
    mk(ang.id, 1, "Angular displacement & velocity", 48, "completed", {
      scheduledDate: addDays(today, -10),
      completedDate: addDays(today, -8),
    }),
    mk(ang.id, 2, "Angular acceleration, relations", 52, "pending", {
      scheduledDate: addDays(today, -6),
    }),
    mk(cent.id, 3, "Centripetal force derivation", 55, "pending", {
      scheduledDate: addDays(today, -4),
    }),
    mk(cent.id, 4, "Banking, death well, problems", 60, "upcoming", {
      scheduledDate: today,
    }),
    mk(n2.id, 5, "Constraint motion", 50, "missed", {
      scheduledDate: addDays(today, -3),
    }),
    mk(hybrid.id, 1, "sp, sp2, sp3 shapes", 40, "completed", {
      scheduledDate: addDays(today, -12),
      completedDate: addDays(today, -11),
    }),
    mk(vbt.id, 2, "Bonding revision set", 35, "needs_revision", {
      scheduledDate: addDays(today, -20),
      completedDate: addDays(today, -18),
    }),
    mk(inductive.id, 1, "Inductive & resonance", 45, "pending", {
      scheduledDate: addDays(today, -5),
    }),
    mk(perm.id, 1, "Permutations core", 50, "completed", {
      scheduledDate: addDays(today, -7),
      completedDate: addDays(today, -2),
    }),
    mk(perm.id, 2, "PNC DPP", 40, "pending", { scheduledDate: today }),
    mk(ap.id, 1, "AP/GP identities", 45, "upcoming", { scheduledDate: addDays(today, 1) }),
  ];

  const l1 = lectures[0];
  const bonding = lectures[5];
  const pncL1 = lectures[8];

  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    subjects: [physics, chem, maths],
    chapters: [circ, lom, bond, goc, pnc, seq],
    topics: [ang, cent, n2, hybrid, vbt, inductive, perm, ap],
    lectures,
    tasks: [
      {
        id: uid("tsk"),
        date: today,
        title: "Physics — Circular Motion L4",
        lectureId: lectures[3].id,
        subjectId: physics.id,
        durationMin: 60,
        done: false,
        order: 0,
      },
      {
        id: uid("tsk"),
        date: today,
        title: "Chemistry — Chemical Bonding revision",
        lectureId: bonding.id,
        subjectId: chem.id,
        durationMin: 25,
        done: false,
        order: 1,
      },
      {
        id: uid("tsk"),
        date: today,
        title: "Maths — PNC DPP",
        lectureId: lectures[9].id,
        subjectId: maths.id,
        durationMin: 40,
        done: false,
        order: 2,
      },
      {
        id: uid("tsk"),
        date: today,
        title: "Clear Physics L2 backlog",
        lectureId: lectures[1].id,
        subjectId: physics.id,
        durationMin: 52,
        done: false,
        order: 3,
      },
    ],
    blocks: [...weekdayTemplate(), ...weekendTemplate()],
    revisions: [
      {
        id: uid("rev"),
        targetType: "lecture",
        targetId: l1.id,
        lastRevision: addDays(today, -8),
        nextDue: addDays(today, -1),
        count: 1,
        confidence: 3,
        performance: 62,
        mistakes: ["sign error in ω relation"],
      },
      {
        id: uid("rev"),
        targetType: "lecture",
        targetId: bonding.id,
        lastRevision: addDays(today, -31),
        nextDue: addDays(today, -10),
        count: 1,
        confidence: 2,
        performance: 48,
        mistakes: ["hybridisation of XeF2"],
      },
      {
        id: uid("rev"),
        targetType: "lecture",
        targetId: pncL1.id,
        lastRevision: addDays(today, -2),
        nextDue: addDays(today, 5),
        count: 1,
        confidence: 4,
        performance: 78,
        mistakes: [],
      },
    ],
    studyDays: [
      { date: addDays(today, -1), minutes: 140, tasksCompleted: 3, lecturesCompleted: 1 },
      { date: addDays(today, -2), minutes: 95, tasksCompleted: 2, lecturesCompleted: 1 },
      { date: addDays(today, -3), minutes: 0, tasksCompleted: 0, lecturesCompleted: 0 },
      { date: addDays(today, -4), minutes: 180, tasksCompleted: 4, lecturesCompleted: 1 },
      { date: addDays(today, -5), minutes: 70, tasksCompleted: 1, lecturesCompleted: 0 },
    ],
  };
}

export function emptyState(): AppState {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    subjects: [],
    chapters: [],
    topics: [],
    lectures: [],
    tasks: [],
    blocks: [],
    revisions: [],
    studyDays: [],
  };
}
