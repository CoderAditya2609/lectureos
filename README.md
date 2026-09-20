# LectureOS

Personal study operating system for lectures, backlog, revision, and study time — built for a Class 11 JEE student.

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints (typically `http://localhost:5173`).

## What it does

- **Dashboard** — today list, remaining study time, backlog, revision, progress, and **What should I do now?**
- **Lectures / Taxonomy** — Subject → Chapter → Topic → Lecture
- **Backlog** — hours, age, recovery estimate, prioritized next lecture
- **Schedule** — weekly timetable with available / blocked / optional windows
- **Revision** — due / approaching / fresh / weak with configurable intervals
- **Analytics** — completion, backlog trend, consistency
- **AI** — NVIDIA API with a provider abstraction; local planner works without a key

Data persists in `localStorage` (`lectureos.v1`). Sample JEE data loads on first visit. Reset or clear from Settings.

Add your NVIDIA API key in Settings for model-backed recommendations. Without a key, the timetable-aware planner still answers **What should I do now?**
