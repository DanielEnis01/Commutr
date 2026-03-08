import { Sparkles } from "lucide-react";

export default function AICard({ loading, tts, reason, mode, chatMessages, listening, isNavigating }) {
  const summary = tts || "Predictions are loading from the parking model.";
  const recentMessages = isNavigating ? (chatMessages || []).slice(-1) : (chatMessages || []).slice(-8);

  return (
    <div className="ai-card">
      <div className="ai-card-glow" />
      <div className="ai-card-content">
        <div className="ai-card-header">
          <Sparkles />
        <div className="ai-card-label">Parking Guidance</div>
        </div>
        <div className="ai-card-message">
          {mode === "voice" ? (
            <div className="voice-chat-feed">
              {recentMessages.length === 0 ? (
                <div className="voice-chat-empty">
                  Voice chat is ready. Say "hey commuter" or tap the mic to start.
                </div>
              ) : (
                recentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`voice-chat-bubble ${message.role === "user" ? "user" : "assistant"}`}
                  >
                    <div className="voice-chat-role">
                      {message.role === "user" ? "You" : "Guidance AI"}
                    </div>
                    <div>{message.text}</div>
                  </div>
                ))
              )}
              <div className="voice-chat-status">
                {isNavigating ? "Route guidance is active." : listening ? "Listening now..." : "Say hey commuter, confirm, or switch to lot."}
              </div>
            </div>
          ) : loading ? (
            <span style={{ opacity: 0.5 }}>Analyzing campus events...</span>
          ) : (
            <>
              <strong>{summary}</strong>
              <br/><br/>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                {reason || "Parking pressure calculated based on active sections."}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
