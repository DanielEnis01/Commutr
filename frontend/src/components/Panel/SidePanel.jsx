import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import Header from "./Header";
import AICard from "./AICard";
import WeatherStrip from "./WeatherStrip";
import LotCard from "./LotCard";
import StatsGrid from "./StatsGrid";
import OccupancyChart from "./OccupancyChart";
import NavigateButton from "./NavigateButton";
import TabBar from "./TabBar";
import { BUILDING_AFFINITY, BUILDING_OPTIONS } from "../../constants/buildingAffinity";

const LOT_CAPACITIES = {
  H: 582,
  I: 114,
  J: 532,
  U: 780,
  P: 90,
  M: 400,
  D: 185,
  C1: 180,
  C2: 159,
  B1: 130,
  B2: 375,
  A1: 110,
  A2: 885,
  N: 72,
  S: 110,
  T: 388,
};

export default function SidePanel({ onNavigateToLot }) {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [useTimeMachine, setUseTimeMachine] = useState(false);
  const [pendingTime, setPendingTime] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [activeTime, setActiveTime] = useState(null);

  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const timestamp = (useTimeMachine && pendingTime) ? pendingTime : null;
      let url = "/api/predict/all";
      if (timestamp) url += `?timestamp=${encodeURIComponent(timestamp)}`;

      const { data } = await api.get(url);
      setPredictions(data);
      setActiveTime(timestamp || null);
    } catch (err) {
      console.error("[Commutr] Failed to fetch predictions", err.message);
      setError("Prediction service is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }, [useTimeMachine, pendingTime]);

  useEffect(() => {
    if (useTimeMachine) return;
    fetchPredictions();
  }, [useTimeMachine, fetchPredictions]);

  const handleTimeMachineToggle = (checked) => {
    setUseTimeMachine(checked);
    if (!checked) {
      setActiveTime(null);
    }
  };

  const REMOVED_LOTS = new Set(["M_west", "M_south", "R", "F"]);
  const baseRankedLots = (predictions?.ranked_lots || [])
    .filter(l => !REMOVED_LOTS.has(l.lot))
    .map(l => l.lot === "M_east" ? { ...l, lot: "M" } : l);
  const buildingAffinity = BUILDING_AFFINITY[selectedBuilding] || null;
  const getOccupancyPenalty = (occupancyPct) => {
    if (occupancyPct >= 95) return 45;
    if (occupancyPct >= 90) return 35;
    if (occupancyPct >= 85) return 22;
    if (occupancyPct >= 75) return 10;
    return 0;
  };
  const getDestinationScore = (lotData) => {
    const affinityWeight = buildingAffinity?.[lotData.lot] || 0;
    const availabilityScore = 100 - (lotData.predicted_occupancy_pct || 0);
    const proximityScore = affinityWeight * 55;
    const availabilityWeight = availabilityScore * 0.45;
    const occupancyPenalty = getOccupancyPenalty(lotData.predicted_occupancy_pct || 0);

    return proximityScore + availabilityWeight - occupancyPenalty;
  };
  const rankedLots = buildingAffinity
    ? [...baseRankedLots]
        .map((lotData) => ({
          ...lotData,
          affinityWeight: buildingAffinity[lotData.lot] || 0,
          destinationScore: getDestinationScore(lotData),
        }))
        .sort((a, b) => {
          const aIsRedZone = (a.predicted_occupancy_pct || 0) >= 90;
          const bIsRedZone = (b.predicted_occupancy_pct || 0) >= 90;
          const aIsViable = (a.predicted_occupancy_pct || 0) < 90 && (a.affinityWeight || 0) > 0;
          const bIsViable = (b.predicted_occupancy_pct || 0) < 90 && (b.affinityWeight || 0) > 0;

          if (aIsViable !== bIsViable) {
            return aIsViable ? -1 : 1;
          }

          if (aIsRedZone !== bIsRedZone) {
            return aIsRedZone ? 1 : -1;
          }

          if (b.destinationScore !== a.destinationScore) {
            return b.destinationScore - a.destinationScore;
          }

          if (a.predicted_occupancy_pct !== b.predicted_occupancy_pct) {
            return a.predicted_occupancy_pct - b.predicted_occupancy_pct;
          }

          return a.lot.localeCompare(b.lot);
        })
        .map((lotData, index) => ({
          ...lotData,
          recommended: index === 0,
        }))
    : baseRankedLots;
  const topLot = rankedLots.length > 0 ? rankedLots[0] : null;
  const chartLotName = topLot?.lot || rankedLots[1]?.lot || null;
  const sysSum = predictions?.summary || {};
  const selectedBuildingLabel = BUILDING_OPTIONS.find((option) => option.value === selectedBuilding)?.label;
  const getAvailableSpots = (lotCode, occupancyPct) => {
    const capacity = LOT_CAPACITIES[lotCode] || 0;
    return Math.max(0, Math.round(capacity * (1 - (occupancyPct || 0) / 100)));
  };
  const getPriorityLabel = (weight) => {
    if (weight >= 1.0) return "Closest";
    if (weight >= 0.6) return "Very close";
    if (weight >= 0.3) return "Near destination";
    if (weight >= 0.1) return "Walkable";
    if (weight > 0) return "Farther walk";
    return "Low priority";
  };
  const closeRiskLot = rankedLots.find((lotData) => (lotData.affinityWeight || 0) >= 0.6 && (lotData.predicted_occupancy_pct || 0) >= 90);
  const alternativeLots = rankedLots
    .filter((lotData) => lotData.lot !== topLot?.lot)
    .filter((lotData) => (lotData.predicted_occupancy_pct || 0) < 90)
    .slice(0, 2);
  const displayTts = topLot
    ? selectedBuildingLabel
      ? `For ${selectedBuildingLabel}, Lot ${topLot.lot} looks like the best balance of proximity and open spaces right now.`
      : `For no specific destination, Lot ${topLot.lot} looks like the best overall option right now.`
    : predictions?.tts_summary;
  const displayReason = topLot
    ? (() => {
        if (selectedBuildingLabel) {
          const parts = [
            `Lot ${topLot.lot} is the best nearby choice at ${topLot.predicted_occupancy_pct}% predicted occupancy.`,
          ];

          if (alternativeLots.length > 0) {
            parts.push(
              `Other good options: ${alternativeLots.map((lotData) => `Lot ${lotData.lot} at ${lotData.predicted_occupancy_pct}%`).join(", ")}.`
            );
          }

          if (closeRiskLot && closeRiskLot.lot !== topLot.lot) {
            parts.push(
              `Lot ${closeRiskLot.lot} is closer, but at ${closeRiskLot.predicted_occupancy_pct}% it may be full or tough to search.`
            );
          }

          return parts.join(" ");
        }

        return `Lot ${topLot.lot} is the strongest overall choice right now. ${alternativeLots.length > 0 ? `Alternatives: ${alternativeLots.map((lotData) => `Lot ${lotData.lot} at ${lotData.predicted_occupancy_pct}%`).join(", ")}.` : ""}`.trim();
      })()
    : topLot?.reason;
  
  const stats = [
    { label: "Active Class Capacity", value: sysSum.total_active_capacity || "0", accent: true },
    { label: "Weather Impact", value: predictions ? `x${predictions.weather_multiplier || "1.0"}` : "...", muted: true },
    { label: "Sections Starting", value: sysSum.events_starting ?? "0", muted: true },
    { label: "Sections Ending", value: sysSum.events_ending ?? "0", green: true },
  ];

  const isSimulating = useTimeMachine && activeTime;

  return (
    <div className="sidebar">
      <Header />

      <div className="sidebar-scroll">
        <div style={{ padding: "0 24px", marginBottom: "16px" }}>
            <div style={{ marginBottom: "12px" }}>
               <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Destination
               </div>
               <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "white",
                    outline: "none",
                  }}
               >
                  {BUILDING_OPTIONS.map((option) => (
                    <option key={option.value || "none"} value={option.value} style={{ background: "#0d0f1a", color: "white" }}>
                      {option.label}
                    </option>
                  ))}
               </select>
               {selectedBuildingLabel && (
                 <div style={{ marginTop: "6px", fontSize: "11px", color: "rgba(94,231,255,0.8)" }}>
                   Recommendations balance walking distance with space availability for {selectedBuildingLabel}.
                 </div>
               )}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
               <input 
                  type="checkbox" 
                  checked={useTimeMachine} 
                  onChange={(e) => handleTimeMachineToggle(e.target.checked)} 
               />
               Custom time
            </label>
            {useTimeMachine && (
               <div style={{ marginTop: "8px" }}>
                 <input 
                    type="datetime-local" 
                    value={pendingTime}
                    onChange={(e) => setPendingTime(e.target.value)}
                    style={{
                       width: "100%", padding: "8px", borderRadius: "8px",
                       background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                       color: "white", colorScheme: "dark"
                    }}
                 />
                 <button
                    onClick={fetchPredictions}
                    style={{
                       width: "100%", marginTop: "8px", padding: "10px", borderRadius: "8px",
                       background: "rgba(255,255,255,0.1)",
                       border: "1px solid rgba(255,255,255,0.16)",
                       color: "white", fontWeight: "600",
                       fontSize: "13px", cursor: "pointer",
                       transition: "opacity 0.2s"
                    }}
                    onMouseOver={(e) => e.target.style.opacity = "0.85"}
                    onMouseOut={(e) => e.target.style.opacity = "1"}
                 >
                    Update predictions
                 </button>
                 {activeTime && (
                    <div style={{ marginTop: "6px", fontSize: "11px", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
                       Showing: {new Date(activeTime).toLocaleString()}
                    </div>
                 )}
               </div>
            )}
        </div>

        <div>
          <div className="section-label">Guidance</div>
          <AICard loading={loading} tts={displayTts} reason={displayReason} />
        </div>

        {predictions && <WeatherStrip weather={predictions?.weather} multiplier={predictions?.weather_multiplier} />}

        <div>
          <div className="section-label">{isSimulating ? "Simulated Predictions" : "Live Lot Predictions"}</div>
          {!predictions && !loading && (
             <div style={{ padding: "24px", textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '12px' }}>
                   {error || (!useTimeMachine ? "Ready to find your spot?" : "Select a time to begin.")}
                </div>
                {!useTimeMachine && (
                  <button 
                    onClick={fetchPredictions}
                    style={{
                        padding: "10px 20px", borderRadius: "10px",
                        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                        color: "white", fontWeight: "600", cursor: "pointer", fontSize: "12px"
                    }}
                  >
                    Load predictions
                  </button>
                )}
             </div>
          )}
          {loading ? (
             <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading predictive models...</div>
          ) : (
            rankedLots.map((lotData, idx) => (
              <LotCard 
                key={lotData.lot} 
                id={lotData.lot}
                name={`Lot ${lotData.lot}`}
                location={selectedBuildingLabel ? getPriorityLabel(lotData.affinityWeight || 0) : idx === 0 ? "Fastest Park" : "Alternative"}
                walkTime="-"
                occupancy={lotData.predicted_occupancy_pct}
                availableSpots={getAvailableSpots(lotData.lot, lotData.predicted_occupancy_pct)}
                recommended={lotData.recommended}
              />
            ))
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="section-label">{isSimulating ? "Simulated Status" : "Campus Right Now"}</div>
          <StatsGrid stats={stats} />
        </div>

        <OccupancyChart lotName={chartLotName} />

        <NavigateButton 
          lotName={topLot ? `Lot ${topLot.lot}` : "..."} 
          onClick={() => {
            if (!topLot) return;
            const targetId = topLot.lot.toLowerCase();
            onNavigateToLot(targetId);
          }} 
        />
      </div>

      <TabBar />
    </div>
  );
}
