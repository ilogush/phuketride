import { createRequestHandler } from "react-router";
import { isSameOriginMutation } from "~/lib/request-security.server";
import { setRuntimeEnv } from "~/lib/runtime-env.server";

declare global {
  interface Env {
    RATE_LIMIT?: KVNamespace;
    SESSION_SECRET?: string;
  }
}

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env & {
        DB: D1Database;
        ASSETS: R2Bucket;
      };
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

const BASE_SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
};

const HTML_CSP =
  "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self' 'unsafe-inline'; connect-src 'self'";

function applyRuntimeHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    if (!headers.has(name)) {
      headers.set(name, value);
    }
  }

  const contentType = headers.get("content-type")?.toLowerCase() || "";
  const pathname = new URL(request.url).pathname;
  const isAssetPath = pathname.startsWith("/assets/");
  const isApiPath = pathname.startsWith("/api/");
  const isHtml = contentType.includes("text/html");
  const isJson = contentType.includes("application/json");

  if (isHtml && !headers.has("content-security-policy")) {
    headers.set("content-security-policy", HTML_CSP);
  }

  if (!headers.has("cache-control") && !isAssetPath) {
    if (response.status >= 500 || isHtml || isApiPath || isJson) {
      headers.set("cache-control", "no-store");
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    setRuntimeEnv(env, import.meta.env.MODE);
    if (!isSameOriginMutation(request)) {
      return applyRuntimeHeaders(request, new Response("Forbidden", { status: 403 }));
    }
    const response = await requestHandler(request, {
      cloudflare: { env, ctx },
    });
    return applyRuntimeHeaders(request, response);
  },
} satisfies ExportedHandler<Env>;
