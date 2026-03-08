import { Sparkles } from "lucide-react";

export default function AICard() {
  return (
    <div className="ai-card">
      <div className="ai-card-glow" />
      <div className="ai-card-content">
        <div className="ai-card-header">
          <Sparkles />
          <div className="ai-card-label">Gemini · Live Prediction</div>
        </div>
        <div className="ai-card-message">
          Hey Alex — <strong>Lot H is your best bet</strong>, 21% predicted
          occupancy. 847 students have class nearby but most are in ECSW. Light
          rain means Lot W's walk will hurt. Routing you now.
        </div>
      </div>
    </div>
  );
}
