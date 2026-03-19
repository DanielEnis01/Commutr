import { useState, useEffect, useCallback } from "react";
import api, { setDevTimeOverride } from "../../services/api";
import Header from "./Header";
import AICard from "./AICard";
import WeatherStrip from "./WeatherStrip";
import LotCard from "./LotCard";
import NavigateButton from "./NavigateButton";
import StatsGrid from "./StatsGrid";
import { BUILDING_AFFINITY, BUILDING_OPTIONS } from "../../constants/buildingAffinity";
import { PERMIT_LABELS } from "../../constants/permits";

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

function DevTestingPanel({
  useTimeMachine,
  handleTimeMachineToggle,
  pendingTime,
  setPendingTime,
  activeTime,
}) {
  return (
    <div className="dev-tools-panel">
      <div className="dev-tools-title">Time Override</div>
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
              width: "100%",
              padding: "8px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              colorScheme: "dark",
            }}
          />
          {activeTime && (
            <div style={{ marginTop: "6px", fontSize: "11px", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
              Showing: {new Date(activeTime).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SidePanel({
  mode,
  onModeChange,
  onNavigateToLot,
  voiceResult,
  voiceState,
  voiceConversation,
  onVoiceTrigger,
  voiceChatMessages,
  isNavigating,
  voicePlaybackActive,
  voiceAutoPending,
  devToolsOpen,
  onToggleDevTools,
  selectedPermit,
  onChangePermit,
  voicePermission,
  onRequestVoicePermission,
}) {
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
      let url = `/api/predict/all?permit=${encodeURIComponent(selectedPermit || "")}`;

      const { data } = await api.get(url);
      setPredictions(data);
      setActiveTime(data?.request_meta?.requested_timestamp || null);
    } catch (err) {
      console.error("[Commutr] Failed to fetch predictions", err.message);
      setError("Prediction service is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }, [useTimeMachine, pendingTime, selectedPermit]);

  useEffect(() => {
    if (!voiceResult) return;
    setPredictions(voiceResult);
    setSelectedBuilding(voiceResult.destination_building || "");
  }, [voiceResult]);

  useEffect(() => {
    let cancelled = false;

    async function syncOverride() {
      try {
        const nextTimestamp = useTimeMachine ? pendingTime : null;
        const result = await setDevTimeOverride(useTimeMachine, nextTimestamp);
        if (!cancelled) {
          setActiveTime(result.time_override || null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[Commutr] Failed to update time override", error.message);
        }
      }
    }

    syncOverride();
    return () => {
      cancelled = true;
    };
  }, [useTimeMachine, pendingTime]);

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

  const summary = predictions?.summary || {};
  const weatherMain = predictions?.weather?.conditions?.[0]?.main || "Clear";
  const stats = [
    {
      label: "Current People In Class",
      value: summary.total_active_capacity ?? "...",
      accent: true,
    },
    {
      label: "Ending Soon",
      value: summary.events_ending ?? "...",
      muted: true,
    },
    {
      label: "Starting Soon",
      value: summary.events_starting ?? "...",
      green: true,
    },
    {
      label: "Weather Effect",
      value: predictions ? weatherMain : "...",
      muted: true,
    },
  ];

  const isSimulating = useTimeMachine && activeTime;
  const showVoicePermissionGate = mode === "voice" && voicePermission !== "granted";

  return (
    <div className="sidebar">
      <Header
        mode={mode}
        onModeChange={onModeChange}
        onToggleDevTools={onToggleDevTools}
        devToolsOpen={devToolsOpen}
        permitLabel={PERMIT_LABELS[selectedPermit] || "Permit"}
        onChangePermit={onChangePermit}
      />

      <div className="sidebar-scroll">
        {devToolsOpen && (
          <DevTestingPanel
            useTimeMachine={useTimeMachine}
            handleTimeMachineToggle={handleTimeMachineToggle}
            pendingTime={pendingTime}
            setPendingTime={setPendingTime}
            activeTime={activeTime}
          />
        )}

        {showVoicePermissionGate ? (
          <div className="voice-permission-gate">
            <div className="section-label">Voice Guidance</div>
            <div className="permission-gate-card compact">
              <div className="permission-gate-eyebrow">Microphone Access</div>
              <h2 className="permission-gate-title compact">Enable voice only when you want to talk</h2>
              <p className="permission-gate-copy compact">
                Commutr will only turn on the microphone while it is actively listening for your next response.
              </p>
              <div className="permission-gate-actions compact">
                <button className="permission-gate-button primary" type="button" onClick={onRequestVoicePermission}>
                  Allow microphone
                </button>
              </div>
              {voicePermission === "denied" && (
                <div className="permission-gate-note">
                  Microphone access is blocked right now. Re-enable it in your browser settings to use voice mode.
                </div>
              )}
            </div>
          </div>
        ) : mode === "voice" ? (
          <>
            <div>
              <div className="section-label">Voice Guidance</div>
              <AICard
                loading={loading}
                tts={displayTts}
                reason={displayReason}
              mode={mode}
              chatMessages={voiceChatMessages}
              listening={voiceState?.busy}
              isNavigating={isNavigating}
            />
            </div>

            <div className="voice-control-panel">
              <button
                className={`voice-prompt-button ${voiceState?.busy || voicePlaybackActive ? "busy" : ""}`}
                onClick={onVoiceTrigger}
                disabled={voiceState?.busy || voicePlaybackActive || voiceAutoPending}
                type="button"
              >
                <span className="voice-prompt-button-label">
                  {voiceState?.busy ? "Listening..." : voicePlaybackActive ? "Speaking..." : voiceAutoPending ? "Preparing..." : "Tap To Speak"}
                </span>
                <span className="voice-prompt-button-sub">
                  {voiceConversation?.awaiting_confirmation
                    ? "Say confirm or switch to another lot"
                    : "Ask for a destination when you are ready"}
                </span>
              </button>

              <div className="voice-heard-text">
                {voiceState?.transcript
                  ? `Heard: ${voiceState.transcript}`
                  : "Heard text will appear here after you speak."}
              </div>

              {voiceConversation?.awaiting_confirmation && voiceConversation?.pending_lot && (
                <div className="voice-confirm-hint">
                  Say <strong>confirm</strong> to start Lot {voiceConversation.pending_lot}, or say <strong>switch to lot</strong> and a lot name.
                </div>
              )}
            </div>
          </>
        ) : (
          <>
        <div>
          <div className="section-label">Guidance</div>
          <AICard
            loading={loading}
            tts={displayTts}
            reason={displayReason}
            mode={mode}
            chatMessages={voiceChatMessages}
            listening={voiceState?.busy}
            isNavigating={isNavigating}
          />
          <div className="drive-fetch-panel">
            <div className="drive-fetch-label">Destination</div>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="drive-destination-select"
            >
              {BUILDING_OPTIONS.map((option) => (
                <option key={option.value || "none"} value={option.value} style={{ background: "#0d0f1a", color: "white" }}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              className="drive-fetch-button"
              type="button"
              onClick={fetchPredictions}
              disabled={!selectedBuilding || loading}
            >
              {loading ? "Fetching..." : "Fetch parking guidance"}
            </button>
          </div>
        </div>

        {predictions && <WeatherStrip weather={predictions?.weather} multiplier={predictions?.weather_multiplier} />}

        <div>
          <div className="section-label">{isSimulating ? "Simulated Predictions" : "Live Lot Predictions"}</div>
          {!predictions && !loading && (
             <div style={{ padding: "24px", textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '12px' }}>
                   {error || (!useTimeMachine ? "Select a destination and fetch parking guidance." : "Select a time to begin.")}
                </div>
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
        <div>
          <div className="section-label">Current Session</div>
          <StatsGrid stats={stats} />
        </div>

        <NavigateButton 
          lotName={topLot ? `Lot ${topLot.lot}` : "..."} 
          onClick={() => {
            if (!topLot) return;
            const targetId = topLot.lot.toLowerCase();
            onNavigateToLot(targetId);
          }} 
        />
          </>
        )}
      </div>
    </div>
  );
}
