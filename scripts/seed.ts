#!/usr/bin/env node
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../app/db/schema";
import { seedTestData } from "./seed-test-data";

// This script is for seeding Cloudflare D1 database only
// Run with: npm run db:seed (requires wrangler dev environment)

async function main() {
    console.error("❌ This script requires Cloudflare D1 connection");
    console.log("Use wrangler CLI to seed the database:");
    console.log("  Local:  npm run db:migrate:local");
    console.log("  Remote: npm run db:migrate:remote");
    console.log("\nFor manual seeding, use SQL files in scripts/ directory");
    process.exit(1);
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
