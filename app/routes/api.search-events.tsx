import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from "~/lib/rate-limit.server";
import { parseWithSchema } from "~/lib/validation.server";

const SEARCH_EVENT_SOURCES = [
  "hero-search",
  "hero-select",
  "hero-submit",
  "search-page-submit",
] as const;

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method.toUpperCase() !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let rateHeaders: Record<string, string> = {};
  try {
    const identifier = getClientIdentifier(request);
    const rateLimit = await checkRateLimit(
      (context.cloudflare.env as { RATE_LIMIT?: KVNamespace }).RATE_LIMIT,
      identifier,
      "api"
    );
    rateHeaders = getRateLimitHeaders(rateLimit);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ ok: false, error: "Too many requests" }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          ...rateHeaders,
        },
      });
    }

    const payload = await request.json();
    const parsed = parseWithSchema(
      z
      .object({
        district: z.string().trim().min(1, "district is required").max(120, "district is too long"),
        query: z.string().trim().max(200, "query is too long").optional().nullable(),
        source: z.enum(SEARCH_EVENT_SOURCES).optional().nullable(),
      }),
      payload,
      "invalid payload"
    );
    if (!parsed.ok) {
      return new Response(JSON.stringify({ ok: false, error: parsed.error }), {
        status: 400,
        headers: {
          "content-type": "application/json",
          ...rateHeaders,
        },
      });
    }

    const district = parsed.data.district;
    const query = parsed.data.query || "";
    const source = parsed.data.source || "hero-search";

    if (!district) {
      return new Response(JSON.stringify({ ok: false, error: "district is required" }), {
        status: 400,
        headers: {
          "content-type": "application/json",
          ...rateHeaders,
        },
      });
    }

    const db = context.cloudflare.env.DB;
    await db
      .prepare(
        `
        INSERT INTO district_search_events (district_name, search_query, source, created_at)
        VALUES (?, ?, ?, ?)
        `,
      )
      .bind(district, query || null, source || "hero-search", Date.now())
      .run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        "content-type": "application/json",
        ...rateHeaders,
      },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: {
        "content-type": "application/json",
        ...rateHeaders,
      },
    });
  }
}
