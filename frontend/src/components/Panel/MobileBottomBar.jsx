import { Sparkles, Mic } from "lucide-react";

export default function MobileBottomBar() {
  return (
    <div className="mobile-bottom-bar">
      <div className="mobile-ai-strip">
        <div className="mobile-ai-left">
          <Sparkles />
          <div className="mobile-ai-text">
            <div className="mobile-ai-label">Parking Guidance</div>
            <div className="mobile-ai-message">Lot H is your best bet at 21% occupancy</div>
          </div>
        </div>
        <button className="mobile-voice-btn">
          <Mic />
        </button>
      </div>
    </div>
  );
}
