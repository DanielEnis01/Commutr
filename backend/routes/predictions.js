import { Router } from "express";
import axios from "axios";

const router = Router();
const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5002";

// GET /api/predict/all
router.get("/predict/all", async (_req, res) => {
  try {
    const { data } = await axios.post(`${ML_URL}/predict`, { lot: "all" });
    res.json({ lots: [], prediction: data.prediction });
  } catch {
    // ML service may not be running yet — return stub
    res.json({ lots: [] });
  }
});

// GET /api/predict/lot/:lotName
router.get("/predict/lot/:lotName", async (req, res) => {
  try {
    const { data } = await axios.post(`${ML_URL}/predict`, {
      lot: req.params.lotName,
    });
    res.json({ lot: req.params.lotName, prediction: data.prediction });
  } catch {
    res.json({ lot: req.params.lotName });
  }
});

// GET /api/predict/timeline/:lotName
router.get("/predict/timeline/:lotName", async (req, res) => {
  try {
    const { data } = await axios.post(`${ML_URL}/predict`, {
      lot: req.params.lotName,
      timeline: true,
    });
    res.json({
      lot: req.params.lotName,
      timeline: [],
      prediction: data.prediction,
    });
  } catch {
    res.json({ lot: req.params.lotName, timeline: [] });
  }
});

export default router;
