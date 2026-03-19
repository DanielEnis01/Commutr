import { PERMIT_OPTIONS } from "../../constants/permits";
import LogoMark from "../Brand/LogoMark";

function BrandWordmark() {
  return (
    <div className="permit-landing-title">
      <span className="permit-landing-title-primary">Commut</span>
      <span className="permit-landing-title-accent">.r</span>
    </div>
  );
}

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

function LocationGate({ locationPermission, onRequestLocationAccess, onSkipLocationAccess }) {
  return (
    <div className="permission-gate-card">
      <div className="permission-gate-eyebrow">Location Access</div>
      <h1 className="permission-gate-title">Let Commutr start with your live location</h1>
      <p className="permission-gate-copy">
        We only use your location to center the map, guide you to the right lot, and improve navigation once you start driving.
      </p>
      <div className="permission-gate-actions">
        <button className="permission-gate-button primary" type="button" onClick={onRequestLocationAccess}>
          Allow location
        </button>
        <button className="permission-gate-button secondary" type="button" onClick={onSkipLocationAccess}>
          Continue without it
        </button>
      </div>
      {locationPermission === "denied" && (
        <div className="permission-gate-note">
          Location is blocked right now. You can still continue, or re-enable it in your browser settings later.
        </div>
      )}
    </div>
  );
}

export default function PermitLanding({
  onSelectPermit,
  locationPermission,
  locationGateComplete,
  onRequestLocationAccess,
  onSkipLocationAccess,
}) {
  if (!locationGateComplete) {
    return (
      <div className="permit-landing">
        <div className="permit-landing-inner">
          <div className="permit-brand-lockup intro">
            <LogoMark className="permit-brand-logo intro" />
            <BrandWordmark />
          </div>
          <LocationGate
            locationPermission={locationPermission}
            onRequestLocationAccess={onRequestLocationAccess}
            onSkipLocationAccess={onSkipLocationAccess}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="permit-landing">
      <div className="permit-landing-inner">
        <div className="permit-brand-lockup">
          <LogoMark className="permit-brand-logo" />
          <BrandWordmark />
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
