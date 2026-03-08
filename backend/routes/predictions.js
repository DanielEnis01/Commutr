import { Router } from "express";
import axios from "axios";
import { getParkingPressureData } from "../services/nebula.js";
import { getWeatherData } from "../services/weather.js";

const router = Router();
const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5002";

function buildRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

router.get("/predict/all", async (req, res) => {
  try {
    const nebulaApiKey = process.env.NEBULA_API_KEY;
    const targetTime = req.query.timestamp;
    const requestId = buildRequestId();
    const requestSource = targetTime ? "time_machine" : "live";

    let classData = { data: { starting: [], current: [], ended: [] } };
    if (nebulaApiKey) {
      classData = await getParkingPressureData(nebulaApiKey, targetTime);
    }

    const weatherApiKey = process.env.OPENWEATHER_API_KEY;
    let weatherMultiplier = 1.0;
    let weatherData = null;

    if (weatherApiKey) {
      weatherData = await getWeatherData(weatherApiKey);
      if (weatherData.severe) {
        weatherMultiplier = 1.6;
      } else if (weatherData.rain || weatherData.snow) {
        weatherMultiplier = 1.3;
      }
    }


    const payload = {
      classes: {
        starting_soon: classData.data.starting,
        currently_active: classData.data.current,
        recently_ended: classData.data.ended
      },
      weather_multiplier: weatherMultiplier,
      weather: weatherData,
      meta: {
        request_id: requestId,
        request_source: requestSource,
        requested_timestamp: targetTime || null,
        campus_query_time: classData.queryTime || null,
      }
    };

    console.log(
      `[Backend][${requestId}] ${requestSource.toUpperCase()} timestamp=${targetTime || "now"} campus_time=${classData.queryTime || "unknown"} active=${classData.data.current.length} starting=${classData.data.starting.length} ended=${classData.data.ended.length} active_capacity=${classData.data.current.reduce((acc, c) => acc + c.capacity, 0)}`
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
