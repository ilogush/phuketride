import type { ActionFunctionArgs } from "react-router";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS district_search_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district_name TEXT NOT NULL,
    search_query TEXT,
    source TEXT,
    created_at INTEGER NOT NULL
  )
`;

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method.toUpperCase() !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = (await request.json()) as {
      district?: unknown;
      query?: unknown;
      source?: unknown;
    };

    const district = typeof payload.district === "string" ? payload.district.trim() : "";
    const query = typeof payload.query === "string" ? payload.query.trim() : "";
    const source = typeof payload.source === "string" ? payload.source.trim() : "hero-search";

    if (!district) {
      return new Response(JSON.stringify({ ok: false, error: "district is required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const db = context.cloudflare.env.DB;
    await db.prepare(CREATE_TABLE_SQL).run();
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
