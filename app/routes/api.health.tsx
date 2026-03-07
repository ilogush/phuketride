/**
 * Health check endpoint for monitoring
 * GET /api/health
 */

import type { LoaderFunctionArgs } from "react-router";
import { performHealthCheck } from "~/lib/monitoring.server";

export async function loader({ context }: LoaderFunctionArgs) {
  const health = await performHealthCheck(
    context.cloudflare.env.DB,
    context.cloudflare.env.ASSETS
  );
  
  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
  
  return new Response(JSON.stringify(health, null, 2), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
