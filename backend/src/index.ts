import express from "express";
import healthRoutes from "./routes/health";

const app = express();

app.use("/api", healthRoutes);

/**
 * @openapi
 * /healthz:
 *   get:
 *     summary: Liveness probe for backend availability.
 *     responses:
 *       '200':
 *         description: Backend is healthy.
 */
app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

export default app;
