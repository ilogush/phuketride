#!/usr/bin/env node
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../app/db/schema";
import { seedTestData } from "./seed-test-data";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("❌ DATABASE_URL not found in .env file");
        console.log("Please add DATABASE_URL to your .env file");
        console.log("For local development: DATABASE_URL=file:.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<db-id>.sqlite");
        process.exit(1);
    }

    console.log("🔌 Connecting to database...");
    const client = createClient({
        url: databaseUrl,
    });

    const db = drizzle(client, { schema });

    await seedTestData(db);

    console.log("👋 Done!");
    process.exit(0);
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
