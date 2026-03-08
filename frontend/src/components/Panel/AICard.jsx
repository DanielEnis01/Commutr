import { Sparkles } from "lucide-react";

export default function AICard({ loading, tts, reason }) {
  const summary = tts || "Predictions are loading from the parking model.";

  return (
    <div className="ai-card">
      <div className="ai-card-glow" />
      <div className="ai-card-content">
        <div className="ai-card-header">
          <Sparkles />
          <div className="ai-card-label">Parking Guidance</div>
        </div>
        <div className="ai-card-message">
          {loading ? (
             <span style={{ opacity: 0.5 }}>Analyzing campus events...</span>
          ) : (
            <>
              <strong>{summary}</strong>
              <br/><br/>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{reason || "Parking pressure calculated based on active sections."}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
