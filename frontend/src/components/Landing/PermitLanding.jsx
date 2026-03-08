import { PERMIT_OPTIONS } from "../../constants/permits";

function PermitCard({ permit, onSelect }) {
  return (
    <button
      type="button"
      className="permit-card"
      onClick={() => onSelect(permit.id)}
      style={{ "--permit-color": permit.color }}
    >
      <div className="permit-card-name">{permit.name}</div>
      <div className="permit-card-description">{permit.description}</div>
      <div className="permit-card-badge">
        {permit.garageAccess ? "Garage access" : "Surface lots only"}
      </div>
    </button>
  );
}

export default function PermitLanding({ onSelectPermit }) {
  return (
    <div className="permit-landing">
      <div className="permit-landing-inner">
        <div className="permit-landing-title">
          <span className="white">commut</span>
          <span className="accent">.r</span>
        </div>
        <div className="permit-landing-tagline">Commute the smart way with AI</div>
        <div className="permit-landing-subtitle">Select your parking permit to begin</div>
        <div className="permit-grid">
          {PERMIT_OPTIONS.map((permit) => (
            <PermitCard key={permit.id} permit={permit} onSelect={onSelectPermit} />
          ))}
        </div>
      </div>
    </div>
  );
}
