import axios from "axios";

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();

const api = axios.create({
  baseURL: configuredBaseUrl || "/",
});

export function fetchAllPredictions() {
  return api.get("/api/predict/all").then((res) => res.data);
}

export function setDevTimeOverride(enabled, timestamp = null) {
  return api.post("/api/dev/time-override", {
    enabled,
    timestamp,
  }).then((res) => res.data);
}

export function fetchLotPrediction(lotName) {
  return api.get(`/api/predict/lot/${lotName}`).then((res) => res.data);
}

export function fetchLotTimeline(lotName) {
  return api.get(`/api/predict/timeline/${lotName}`).then((res) => res.data);
}

export function submitVoiceChat(audioBase64, mimeType, voiceContext = null, permitId = null) {
  return api.post("/api/voice/chat", {
    audio_base64: audioBase64,
    mime_type: mimeType,
    voice_context: voiceContext,
    permit_id: permitId,
  }).then((res) => res.data);
}

export function speakText(text) {
  return api.post("/api/voice/speak", { text }).then((res) => res.data);
}

export default api;
