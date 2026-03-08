import { Router } from "express";
import axios from "axios";
import { buildPredictionContext } from "../services/pipeline.js";

const router = Router();
const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5002";

function buildRequestId() {
  return `voice_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

router.post("/voice/chat", async (req, res) => {
  try {
    const requestId = buildRequestId();
    const {
      audio_base64: audioBase64,
      mime_type: mimeType,
      voice_context: voiceContext,
      permit_id: permitId,
    } = req.body || {};

    if (!audioBase64) {
      return res.status(400).json({ error: "audio_base64 is required" });
    }

    const context = await buildPredictionContext();
    const payload = {
      ...context.payload,
      audio_base64: audioBase64,
      mime_type: mimeType || "audio/webm",
      permit_id: permitId || null,
      voice_context: voiceContext || null,
      meta: {
        request_id: requestId,
        request_source: "voice",
        requested_timestamp: context.effectiveTargetTime || null,
        campus_query_time: context.classData.queryTime || null,
      },
    };

    const { data } = await axios.post(`${ML_URL}/api/ml/voice/chat`, payload);
    res.json(data);
  } catch (error) {
    console.error("Error in voice chat pipeline:", error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Voice chat pipeline failed" }
    );
  }
});

router.post("/voice/speak", async (req, res) => {
  try {
    const { text } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    const { data } = await axios.post(`${ML_URL}/api/ml/voice/speak`, { text });
    res.json(data);
  } catch (error) {
    console.error("Error in voice speak pipeline:", error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Voice speak pipeline failed" }
    );
  }
});

export default router;
