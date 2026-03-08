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
      {tabs.map((tab) => {
        const IconComponent = tab.icon;

        return (
          <button
            key={tab.id}
            className={`tab-btn ${active === tab.id ? "active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            <IconComponent />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
