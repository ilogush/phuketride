#!/usr/bin/env node
/**
 * Script to check users in the database
 * Usage: npx tsx scripts/check-users.ts
 */

import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "../app/db/schema";
import { verifyPasswordHash } from "../app/lib/password.server";

// Test credentials to check
const TEST_USERS = [
    { email: "admin@phuketride.com", password: "admin123" },
    { email: "test@phuketride.com", password: "password123" },
    { email: "user@test.com", password: "user123" },
];

async function main() {
    console.log("🔍 Checking users in database...\n");

    // Check if we're in Cloudflare environment
    let db;
    try {
        // Try to access D1 from Cloudflare bindings
        const env = process.env as unknown as { DB?: D1Database };
        
        if (!env.DB) {
            console.error("❌ No database connection found!");
            console.error("\nThis script requires Cloudflare D1 connection.");
            console.error("Run it with:");
            console.error("  1. wrangler dev (then call via HTTP)");
            console.error("  2. Or create a route to test login");
            console.error("\nAlternatively, check your .dev.vars file:");
            console.error("  CLOUDFLARE_ACCOUNT_ID=...");
            console.error("  CLOUDFLARE_D1_DATABASE_ID=...");
            console.error("  CLOUDFLARE_API_TOKEN=...");
            process.exit(1);
        }

        db = drizzle(env.DB, { schema });
    } catch (error) {
        console.error("❌ Database connection error:", error);
        process.exit(1);
    }

    // Get all users
    const allUsers = await db.select().from(schema.users);
    
    console.log(`📊 Total users in database: ${allUsers.length}\n`);
    
    if (allUsers.length === 0) {
        console.log("⚠️  Database is empty!");
        console.log("\nRun migration and seed:");
        console.log("  npm run db:generate");
        console.log("  npm run db:migrate:remote");
        console.log("  npm run db:seed");
        process.exit(0);
    }

    // Print all users
    console.log("📋 All users:");
    console.log("─".repeat(80));
    console.log(
        "ID".padEnd(38),
        "Email".padEnd(30),
        "Role".padEnd(10),
        "Has Password"
    );
    console.log("─".repeat(80));
    
    for (const user of allUsers) {
        console.log(
            user.id.padEnd(38),
            user.email.padEnd(30),
            user.role.padEnd(10),
            user.passwordHash ? "✓" : "✗"
        );
    }
    console.log("─".repeat(80));
    console.log();

    // Test credentials
    console.log("🔐 Testing credentials:");
    console.log("─".repeat(80));
    
    for (const { email, password } of TEST_USERS) {
        const user = allUsers.find(u => u.email === email);
        
        if (!user) {
            console.log(`⚠️  ${email} - NOT FOUND`);
            continue;
        }

        if (!user.passwordHash) {
            console.log(`❌ ${email} - No password hash!`);
            continue;
        }

        const isValid = await verifyPasswordHash(password, user.passwordHash);
        
        if (isValid) {
            console.log(`✅ ${email} - Password OK (${user.role})`);
        } else {
            console.log(`❌ ${email} - Password INVALID`);
            console.log(`   Hash: ${user.passwordHash.substring(0, 50)}...`);
        }
    }
    console.log("─".repeat(80));
    console.log();

    // Show password hash format
    console.log("📝 Password hash format:");
    console.log("  pbkdf2$sha256$iterations$salt$derivedKey");
    console.log();
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
