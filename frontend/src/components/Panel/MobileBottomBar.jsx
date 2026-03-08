import { Sparkles, Mic } from "lucide-react";

export default function MobileBottomBar({ message, onMicClick, voiceBusy, chatMessages, listening, isNavigating }) {
  const recentMessages = isNavigating ? (chatMessages || []).slice(-1) : (chatMessages || []).slice(-3);

  return (
    <div className="mobile-bottom-bar">
      <div className="mobile-ai-strip">
        <div className="mobile-ai-left">
          <Sparkles />
          <div className="mobile-ai-text">
            <div className="mobile-ai-label">Parking Guidance</div>
            <div className="mobile-ai-message">
              {listening ? "Listening..." : (message || "Voice guidance is ready")}
            </div>
          </div>
        </div>
        <button className="mobile-voice-btn" onClick={onMicClick} disabled={voiceBusy}>
          <Mic />
        </button>
      </div>
      <div className="mobile-chat-stack">
        {recentMessages.map((messageItem) => (
          <div
            key={messageItem.id}
            className={`mobile-chat-bubble ${messageItem.role === "user" ? "user" : "assistant"}`}
          >
            <div className="mobile-chat-role">
              {messageItem.role === "user" ? "You" : "Guidance AI"}
            </div>
            <div>{messageItem.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
