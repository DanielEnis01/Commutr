import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import predictionsRouter from "./routes/predictions.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use("/api", predictionsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
