import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/",
});

export function fetchAllPredictions() {
  return api.get("/api/predict/all").then((res) => res.data);
}

export function fetchLotPrediction(lotName) {
  return api.get(`/api/predict/lot/${lotName}`).then((res) => res.data);
}

export function fetchLotTimeline(lotName) {
  return api.get(`/api/predict/timeline/${lotName}`).then((res) => res.data);
}

export default api;
