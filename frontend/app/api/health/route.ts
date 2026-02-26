/**
 * Serves a basic API health signal for liveness checks.
 */
export function GET() {
  return Response.json({ ok: true });
}
