import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method.toUpperCase() !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await request.json();
    const parsed = parseWithSchema(
      z
      .object({
        district: z.string().trim().min(1, "district is required"),
        query: z.string().trim().optional().nullable(),
        source: z.string().trim().optional().nullable(),
      }),
      payload,
      "invalid payload"
    );
    if (!parsed.ok) {
      return new Response(JSON.stringify({ ok: false, error: parsed.error }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const district = parsed.data.district;
    const query = parsed.data.query || "";
    const source = parsed.data.source || "hero-search";

    if (!district) {
      return new Response(JSON.stringify({ ok: false, error: "district is required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
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
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
