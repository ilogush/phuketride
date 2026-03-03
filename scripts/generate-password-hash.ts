#!/usr/bin/env node
/**
 * Generate password hash for a specific user
 * Usage: npx tsx scripts/generate-password-hash.ts
 */

import { hashPassword } from "../app/lib/password.server";

const EMAIL = "ilogush@icloud.com";
const PASSWORD = "220232";

async function main() {
    console.log(`Generating password hash for: ${EMAIL}`);
    console.log(`Password: ${PASSWORD}\n`);
    
    const hash = await hashPassword(PASSWORD);
    
    console.log("✅ Generated hash:");
    console.log(hash);
    console.log();
    
    console.log("Use parameterized update via your secure admin flow or migration script.");
    console.log("Avoid building SQL with string interpolation for email/hash values.");
}

main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});
