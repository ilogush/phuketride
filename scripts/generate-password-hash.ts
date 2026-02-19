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
    
    console.log("📝 SQL command to update the user:");
    console.log("─".repeat(80));
    console.log(`wrangler d1 execute phuketride-bd --remote --command "UPDATE users SET password_hash = '${hash}' WHERE email = '${EMAIL}';"`);
    console.log("─".repeat(80));
    console.log();
    
    console.log("Or run this SQL in Wrangler Studio:");
    console.log("─".repeat(80));
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = '${EMAIL}';`);
    console.log("─".repeat(80));
}

main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});
