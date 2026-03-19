import LogoMark from "../Brand/LogoMark";

export default function Header({ mode, onModeChange, onToggleDevTools, devToolsOpen, permitLabel, onChangePermit }) {
  return (
    <div className="header">
      <button className="header-logo" type="button" onClick={onChangePermit}>
        <LogoMark className="header-logo-mark" />
        <span className="header-logo-text">
          <span className="header-logo-primary">Commut</span>
          <span className="header-logo-accent">.r</span>
        </span>
      </button>

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
