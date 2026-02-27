import { Router } from "express";

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: API health check endpoint.
 *     responses:
 *       '200':
 *         description: API is healthy.
 */
router.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

export default router;
