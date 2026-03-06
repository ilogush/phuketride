import assert from "node:assert/strict";
import { action } from "../app/routes/api.search-events";

class MemoryKV {
  private store = new Map<string, string>();

  async get(key: string, type?: "text" | "json") {
    const raw = this.store.get(key) ?? null;
    if (raw === null) return null;
    if (type === "json") return JSON.parse(raw);
    return raw;
  }

  async put(key: string, value: string) {
    this.store.set(key, value);
  }
}

class DbMock {
  inserts: Array<{ sql: string; args: unknown[] }> = [];

  prepare(sql: string) {
    return {
      bind: (...args: unknown[]) => ({
        run: async () => {
          this.inserts.push({ sql, args });
          return { success: true };
        },
      }),
    };
  }
}

function buildContext(db: DbMock, kv?: KVNamespace) {
  return {
    cloudflare: {
      env: {
        DB: db,
        RATE_LIMIT: kv,
      },
    },
  } as unknown as {
    cloudflare: {
      env: {
        DB: D1Database;
        RATE_LIMIT?: KVNamespace;
      };
    };
  };
}

async function run() {
  const db = new DbMock();
  const kv = new MemoryKV() as unknown as KVNamespace;
  const baseHeaders = { "content-type": "application/json", "CF-Connecting-IP": "1.1.1.1" };

  const okRequest = new Request("http://localhost/api/search-events", {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ district: "Patong", query: "suv", source: "hero-submit" }),
  });
  const okResponse = await action({ request: okRequest, context: buildContext(db, kv), params: {} } as never);
  assert.equal(okResponse.status, 200, "valid payload should succeed");
  const okJson = await okResponse.json() as { ok?: boolean };
  assert.equal(okJson.ok, true, "success response should contain ok=true");
  assert.equal(db.inserts.length, 1, "one event should be inserted");

  const invalidSourceRequest = new Request("http://localhost/api/search-events", {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ district: "Patong", source: "unknown-source" }),
  });
  const invalidSourceResponse = await action({ request: invalidSourceRequest, context: buildContext(db, kv), params: {} } as never);
  assert.equal(invalidSourceResponse.status, 400, "invalid source should fail validation");

  const longQueryRequest = new Request("http://localhost/api/search-events", {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ district: "Patong", query: "x".repeat(300), source: "hero-submit" }),
  });
  const longQueryResponse = await action({ request: longQueryRequest, context: buildContext(db, kv), params: {} } as never);
  assert.equal(longQueryResponse.status, 400, "too long query should be rejected");

  const rateLimitKey = "rate_limit:api:ip:1.1.1.1";
  const resetAt = Date.now() + 60_000;
  await (kv as unknown as MemoryKV).put(rateLimitKey, JSON.stringify({ count: 100, resetAt }));
  const blockedRequest = new Request("http://localhost/api/search-events", {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({ district: "Patong", source: "hero-submit" }),
  });
  const blockedResponse = await action({ request: blockedRequest, context: buildContext(db, kv), params: {} } as never);
  assert.equal(blockedResponse.status, 429, "rate limited request should return 429");
  const blockedJson = await blockedResponse.json() as { ok?: boolean };
  assert.equal(blockedJson.ok, false, "rate limited response should have ok=false");

  console.log("smoke-api-search-events: ok");
}

run().catch((error) => {
  console.error("smoke-api-search-events: failed");
  console.error(error);
  process.exit(1);
});
