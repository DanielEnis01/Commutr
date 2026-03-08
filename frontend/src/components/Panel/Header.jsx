export default function Header({ mode, onModeChange, onToggleDevTools, devToolsOpen, permitLabel, onChangePermit }) {
  return (
    <div className="header">
      <div className="header-logo">
        <span className="white">commut</span>
        <span className="accent">.r</span>
      </div>

      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === "manual" ? "active" : ""}`}
          onClick={() => onModeChange("manual")}
        >
          Manual
        </button>
        <button
          className={`mode-btn ${mode === "voice" ? "active" : ""}`}
          onClick={() => onModeChange("voice")}
        >
          Voice
        </button>
      </div>

      <button
        className={`dev-tools-btn ${devToolsOpen ? "active" : ""}`}
        onClick={onToggleDevTools}
        type="button"
      >
        Dev Testing
      </button>
      <button className="permit-chip-btn" type="button" onClick={onChangePermit}>
        {permitLabel}
      </button>
    </div>
  );
}
