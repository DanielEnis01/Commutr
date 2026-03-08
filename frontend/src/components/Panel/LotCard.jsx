import { Star } from "lucide-react";

function getColorTier(occupancy) {
  if (occupancy < 40) return "green";
  if (occupancy < 75) return "accent";
  return "muted";
}

export default function LotCard({
  id,
  name,
  location,
  walkTime,
  occupancy,
  availableSpots,
  recommended = false,
}) {
  const tier = getColorTier(occupancy);

  return (
    <div className={`lot-card ${recommended ? "recommended" : ""}`}>
      {recommended && <div className="lot-card-indicator" />}

      <div className={`lot-icon ${tier}`}>{id.toUpperCase()}</div>

      <div className="lot-info">
        <div className="lot-name-row">
          <div className="lot-name">{name}</div>
          {recommended && (
            <div className="lot-best-badge">
              <Star />
              Best
            </div>
          )}
        </div>
        <div className="lot-detail">
          {location} · {walkTime}
        </div>
        <div className="lot-bar">
          <div
            className={`lot-bar-fill ${tier}`}
            style={{ width: `${occupancy}%` }}
          />
        </div>
      </div>

      <div className="lot-pct">
        <div className={`lot-pct-value ${tier}`}>{occupancy}%</div>
        <div className="lot-pct-spots">~{availableSpots} open</div>
      </div>
    </div>
  );
}
