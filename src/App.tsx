import { useState } from "react";
import type { RouteId } from "./types";
import { Dashboard } from "./screens/Dashboard";
import { Lectures } from "./screens/Lectures";
import { Backlog } from "./screens/Backlog";
import { Taxonomy } from "./screens/Taxonomy";
import { Schedule } from "./screens/Schedule";
import { Revision } from "./screens/Revision";
import { Analytics } from "./screens/Analytics";
import { AIScreen } from "./screens/AI";
import { Settings } from "./screens/Settings";

const NAV: { id: RouteId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "lectures", label: "Lectures" },
  { id: "backlog", label: "Backlog" },
  { id: "taxonomy", label: "Taxonomy" },
  { id: "schedule", label: "Schedule" },
  { id: "revision", label: "Revision" },
  { id: "analytics", label: "Analytics" },
  { id: "ai", label: "AI" },
  { id: "settings", label: "Settings" },
];

export default function App() {
  const [route, setRoute] = useState<RouteId>("dashboard");

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <small>Personal OS</small>
          <strong>LectureOS</strong>
        </div>
        <nav className="nav" aria-label="Primary">
          {NAV.map((item) => (
            <button key={item.id} className={route === item.id ? "active" : ""} onClick={() => setRoute(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="meta">Class 11 · JEE track</div>
      </aside>
      <main className="main">
        {route === "dashboard" && <Dashboard />}
        {route === "lectures" && <Lectures />}
        {route === "backlog" && <Backlog />}
        {route === "taxonomy" && <Taxonomy />}
        {route === "schedule" && <Schedule />}
        {route === "revision" && <Revision />}
        {route === "analytics" && <Analytics />}
        {route === "ai" && <AIScreen />}
        {route === "settings" && <Settings />}
      </main>
      <nav className="mobile-nav" aria-label="Mobile">
        {NAV.map((item) => (
          <button key={item.id} className={route === item.id ? "active" : ""} onClick={() => setRoute(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
