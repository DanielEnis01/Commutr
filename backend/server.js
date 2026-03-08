import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import devRouter from "./routes/dev.js";
import predictionsRouter from "./routes/predictions.js";
import voiceRouter from "./routes/voice.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "15mb" }));
app.use("/api", devRouter);
app.use("/api", predictionsRouter);
app.use("/api", voiceRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
