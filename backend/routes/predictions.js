import { Router } from "express";
import axios from "axios";
import { buildPredictionContext } from "../services/pipeline.js";
import { buildLocalPredictionResponse } from "../services/localPredictions.js";

const router = Router();
const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5002";
const ML_TIMEOUT_MS = Number(process.env.ML_SERVICE_TIMEOUT_MS || 10000);

function buildRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePredictionResponse(data, fallbackMeta = {}) {
  const rankedLots = (data?.ranked_lots || []).map((lot) => ({
    ...lot,
    lot: lot?.lot === "M_east" ? "M" : lot?.lot,
  }));

  return {
    ...data,
    ranked_lots: rankedLots,
    request_meta: {
      ...fallbackMeta,
      ...(data?.request_meta || {}),
    },
  };
}

router.get("/predict/all", async (req, res) => {
  let payload = null;
  let requestId = null;

  try {
    const permitId = req.query.permit || null;
    requestId = buildRequestId();
    const context = await buildPredictionContext();
    const requestSource = context.effectiveTargetTime ? "time_machine" : "live";
    payload = {
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

    const { data } = await axios.post(`${ML_URL}/api/ml/predict/all`, payload, {
      timeout: ML_TIMEOUT_MS,
    });

    res.json(normalizePredictionResponse(data, payload.meta));
  } catch (error) {
    const status = error.response?.status || null;
    const url = error.config?.url || `${ML_URL}/api/ml/predict/all`;
    const responseBody = error.response?.data || null;

    console.error(
      `[Backend][predict/all] Downstream ML request failed status=${status || "none"} url=${url} message=${error.message}`,
      responseBody
    );

    try {
      if (!payload) {
        throw new Error("Prediction payload was unavailable for fallback.");
      }

      const fallbackResponse = buildLocalPredictionResponse(payload);

      console.warn(
        `[Backend][${requestId}] Serving local prediction fallback after downstream failure status=${status || "none"}`
      );

      res.json(
        normalizePredictionResponse(fallbackResponse, {
          ...payload.meta,
          ml_fallback_reason: status ? `downstream_${status}` : "downstream_unreachable",
        })
      );
    } catch (fallbackError) {
      console.error("Error in local prediction fallback:", fallbackError.message);
      res.status(500).json({
        error: "Prediction pipeline failed",
        ranked_lots: [],
        tts_summary: "I'm having trouble with the predictions service right now.",
      });
    }
  }
});

router.get("/predict/lot/:lotName", async (req, res) => {
  res.json({ lot: req.params.lotName });
});

router.get("/predict/timeline/:lotName", async (req, res) => {
  res.json({ lot: req.params.lotName, timeline: [] });
});

export default router;
