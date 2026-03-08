import { useState } from "react";

export default function Header() {
  const [mode, setMode] = useState("drive");

  return (
    <div className="header">
      <div className="header-logo">
        <span className="white">commut</span>
        <span className="accent">.r</span>
      </div>

      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === "drive" ? "active" : ""}`}
          onClick={() => setMode("drive")}
        >
          Drive
        </button>
        <button
          className={`mode-btn ${mode === "browse" ? "active" : ""}`}
          onClick={() => setMode("browse")}
        >
          Browse
        </button>
      </div>
    </div>
  );
}
