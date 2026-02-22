import express from "express";
import healthRoutes from "./routes/health";

const app = express();

app.use("/api", healthRoutes);

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

export default app;
