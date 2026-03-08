import { Navigation, BarChart3, Mic, Settings } from "lucide-react";
import { useState } from "react";

const tabs = [
  { id: "navigate", icon: Navigation, label: "Navigate" },
  { id: "stats", icon: BarChart3, label: "Stats" },
  { id: "voice", icon: Mic, label: "Voice" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export default function TabBar() {
  const [active, setActive] = useState("navigate");

  return (
    <div className="tab-bar">
      {tabs.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`tab-btn ${active === id ? "active" : ""}`}
          onClick={() => setActive(id)}
        >
          <Icon />
          {label}
        </button>
      ))}
    </div>
  );
}
