import { Router } from "express";
import { clearTimeOverride, getTimeOverride, setTimeOverride } from "../services/devOverride.js";

const router = Router();

router.get("/dev/time-override", (_req, res) => {
  res.json({ time_override: getTimeOverride() });
});

router.post("/dev/time-override", (req, res) => {
  const enabled = Boolean(req.body?.enabled);
  const timestamp = req.body?.timestamp || null;

  if (enabled && !timestamp) {
    return res.status(400).json({ error: "timestamp is required when enabled is true" });
  }

  const next = enabled ? setTimeOverride(timestamp) : clearTimeOverride();
  res.json({ time_override: next });
});

export default router;
