import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCarPathSegment, parseCarPathSegment } from "../app/lib/car-path";
import { calculateBaseTripTotal } from "../app/lib/pricing";
import { checkRateLimit } from "../app/lib/rate-limit.server";

class MemoryKV {
  private store = new Map<string, string>();

  async get(key: string, type?: "text" | "json") {
    const raw = this.store.get(key) ?? null;
    if (raw === null) {
      return null;
    }
    if (type === "json") {
      return JSON.parse(raw);
    }
    return raw;
  }

  async put(key: string, value: string) {
    this.store.set(key, value);
  }
}

async function run() {
  const routesFile = readFileSync(resolve(process.cwd(), "app/routes.ts"), "utf8");
  assert.match(routesFile, /route\("search-cars",\s*"routes\/search-cars\.tsx"\)/, "search-cars route is missing");
  assert.match(routesFile, /route\("api\/search-events",\s*"routes\/api\.search-events\.tsx"\)/, "api.search-events route is missing");
  assert.match(routesFile, /route\("cars\/:id\/checkout",\s*"routes\/cars\.\$id\.checkout\.tsx"\)/, "checkout route is missing");

  const segment = buildCarPathSegment("Phuket Ride", "Toyota", "Yaris", "AB 1234");
  const parsed = parseCarPathSegment(segment);
  assert.ok(parsed, "parseCarPathSegment returned null");
  assert.equal(parsed?.full, segment, "path segment roundtrip mismatch");
  assert.ok((parsed?.plateTail || "").length > 0, "plate tail must be present");

  const start = new Date("2026-03-06T10:00:00Z");
  const end = new Date("2026-03-09T10:00:00Z");
  const trip = calculateBaseTripTotal(1000, start, end);
  assert.equal(trip.days, 3, "trip days should be 3");
  assert.equal(trip.total, 3000, "trip total should be daily * days");

  const kv = new MemoryKV() as unknown as KVNamespace;
  const identity = "ip:127.0.0.1";
  for (let i = 0; i < 100; i += 1) {
    const result = await checkRateLimit(kv, identity, "api");
    assert.equal(result.allowed, true, `request ${i + 1} should be allowed`);
  }
  const blocked = await checkRateLimit(kv, identity, "api");
  assert.equal(blocked.allowed, false, "101st request should be blocked for api limit");

  console.log("smoke-client: ok");
}

run().catch((error) => {
  console.error("smoke-client: failed");
  console.error(error);
  process.exit(1);
});
