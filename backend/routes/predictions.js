import { Router } from "express";
import axios from "axios";
import { buildPredictionContext } from "../services/pipeline.js";

const router = Router();
const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5002";

function buildRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

router.get("/predict/all", async (req, res) => {
  try {
    const permitId = req.query.permit || null;
    const requestId = buildRequestId();
    const context = await buildPredictionContext();
    const requestSource = context.effectiveTargetTime ? "time_machine" : "live";
    const payload = {
      ...context.payload,
      permit_id: permitId,
      meta: {
        request_id: requestId,
        request_source: requestSource,
        requested_timestamp: context.effectiveTargetTime || null,
        campus_query_time: context.classData.queryTime || null,
      }
    };

    console.log(
      `[Backend][${requestId}] ${requestSource.toUpperCase()} timestamp=${context.effectiveTargetTime || "now"} campus_time=${context.classData.queryTime || "unknown"} active=${context.classData.data.current.length} starting=${context.classData.data.starting.length} ended=${context.classData.data.ended.length} active_capacity=${context.classData.data.current.reduce((acc, c) => acc + c.capacity, 0)}`
    );

    const { data } = await axios.post(`${ML_URL}/api/ml/predict/all`, payload);

    res.json({
      ...data,
      request_meta: payload.meta
    });
  } catch (error) {
    console.error("Error in prediction pipeline:", error.message);
    res.status(500).json({
      error: "Prediction pipeline failed",
      ranked_lots: [],
      tts_summary: "I'm having trouble with the predictions service right now."
    });
  }
});

router.get("/predict/lot/:lotName", async (req, res) => {
  res.json({ lot: req.params.lotName });
});

router.get("/predict/timeline/:lotName", async (req, res) => {
  res.json({ lot: req.params.lotName, timeline: [] });
});

export default router;
