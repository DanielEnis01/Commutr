import { Router } from "express";
import axios from "axios";
import { buildPredictionContext } from "../services/pipeline.js";

const router = Router();
const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5002";
const ML_TIMEOUT_MS = Number(process.env.ML_SERVICE_TIMEOUT_MS || 10000);

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

    console.log(`[Backend][${requestId}] Voice chat request -> ${ML_URL}/api/ml/voice/chat`);

    const { data } = await axios.post(`${ML_URL}/api/ml/voice/chat`, payload, {
      timeout: ML_TIMEOUT_MS,
    });

    res.json(data);
  } catch (error) {
    console.error(
      `[Backend][voice.chat] Downstream failure status=${error.response?.status || "none"} url=${error.config?.url || `${ML_URL}/api/ml/voice/chat`} message=${error.message}`,
      error.response?.data || null
    );
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Voice chat pipeline failed" }
    );
  }
});

router.post("/voice/speak", async (req, res) => {
  try {
    const requestId = buildRequestId();
    const { text } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    console.log(`[Backend][${requestId}] Voice speak request -> ${ML_URL}/api/ml/voice/speak text_length=${text.length}`);

    const { data } = await axios.post(`${ML_URL}/api/ml/voice/speak`, { text }, {
      timeout: ML_TIMEOUT_MS,
    });

    res.json(data);
  } catch (error) {
    console.error(
      `[Backend][voice.speak] Downstream failure status=${error.response?.status || "none"} url=${error.config?.url || `${ML_URL}/api/ml/voice/speak`} message=${error.message}`,
      error.response?.data || null
    );

    const { text } = req.body || {};
    res.json({
      text: text || "",
      audio_base64: null,
      mime_type: null,
      tts_status: "unavailable",
      tts_error: error.response?.data?.error || error.message || "Voice speak pipeline failed",
    });
  }
});

export default router;
