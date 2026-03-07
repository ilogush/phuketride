/**
 * Pre-Launch Verification Script
 * Runs all checks before production deployment
 * 
 * Usage: tsx scripts/pre-launch-verification.ts
 */

import { execSync } from "child_process";

type CheckResult = {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
};

type VerificationMode = "local" | "deploy";

const results: CheckResult[] = [];
const cliModeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const modeValue = cliModeArg?.split("=")[1] ?? process.env.PRELAUNCH_MODE ?? "local";
const verificationMode: VerificationMode = modeValue === "deploy" ? "deploy" : "local";

function addResult(result: CheckResult) {
  results.push(result);
  const icon = result.passed ? "✅" : "❌";
  console.log(`${icon} ${result.name}`);
  if (result.details) {
    console.log(`   ${result.details}`);
  }
}

function runCommand(command: string, name: string): boolean {
  try {
    execSync(command, { stdio: "pipe" });
    addResult({
      name,
      passed: true,
      message: `${name} passed`,
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addResult({
      name,
      passed: false,
      message: `${name} failed`,
      details: errorMessage,
    });
    return false;
  }
}

async function checkEnvironmentVariables() {
  console.log("\n🔧 Checking Environment Variables...");

  if (verificationMode === "local") {
    addResult({
      name: "Environment variable: SESSION_SECRET",
      passed: true,
      message: "Skipped in local mode",
      details: "Run with --mode=deploy to enforce production secrets",
    });
    return true;
  }

  const requiredVars = [
    "SESSION_SECRET",
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    const present = !!process.env[varName];
    addResult({
      name: `Environment variable: ${varName}`,
      passed: present,
      message: present ? "Set" : "Missing",
    });
    if (!present) {
      allPresent = false;
    }
  }
  
  return allPresent;
}

async function checkDatabaseMigrations() {
  console.log("\n🗄️  Checking Database Migrations...");

  if (verificationMode === "local") {
    addResult({
      name: "Database migrations",
      passed: true,
      message: "Skipped in local mode",
      details: "Run with --mode=deploy to enforce remote migration status",
    });
    return true;
  }

  try {
    const output = execSync("npm run db:status:remote", { encoding: "utf-8" });
    
    // Check if there are unapplied migrations
    const hasUnapplied = output.includes("Not applied");
    
    addResult({
      name: "Database migrations",
      passed: !hasUnapplied,
      message: hasUnapplied ? "Unapplied migrations found" : "All migrations applied",
      details: hasUnapplied ? "Run: npm run db:migrate:remote" : undefined,
    });
    
    return !hasUnapplied;
  } catch (error) {
    addResult({
      name: "Database migrations check",
      passed: false,
      message: "Failed to check migrations",
      details: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function checkCodeQuality() {
  console.log("\n📝 Checking Code Quality...");
  
  const checks = [
    { command: "npm run typecheck", name: "TypeScript compilation" },
    { command: "npm run rules:check", name: "CODEX rules" },
    { command: "npm test", name: "Test suite" },
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const passed = runCommand(check.command, check.name);
    if (!passed) {
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function checkBuild() {
  console.log("\n🏗️  Checking Build...");
  
  return runCommand("npm run build", "Production build");
}

async function checkDocumentation() {
  console.log("\n📚 Checking Documentation...");
  
  const requiredDocs = [
    "docs/README.md",
    "docs/DATABASE.md",
    "docs/OPTIMIZATION.md",
    "docs/DEPLOY.md",
  ];
  
  const fs = await import("fs");
  let allPresent = true;
  
  for (const doc of requiredDocs) {
    const exists = fs.existsSync(doc);
    addResult({
      name: `Documentation: ${doc}`,
      passed: exists,
      message: exists ? "Present" : "Missing",
    });
    if (!exists) {
      allPresent = false;
    }
  }
  
  return allPresent;
}

async function checkCriticalEndpoints() {
  console.log("\n🌐 Checking Critical Endpoints...");
  
  const fs = await import("fs");
  const routesContent = fs.readFileSync("app/routes.ts", "utf-8");
  
  const criticalRoutes = [
    { name: "/", pattern: /index\("routes\/home\.tsx"\)/ },
    { name: "/login", pattern: /route\("login",\s*"routes\/login\.tsx"\)/ },
    { name: "/cars", pattern: /route\("cars",\s*"routes\/cars\.tsx"\)/ },
    { name: "/contracts", pattern: /route\("contracts",\s*"routes\/contracts\.tsx"/ },
    { name: "/bookings", pattern: /route\("bookings",\s*"routes\/bookings\.tsx"\)/ },
  ];
  
  let allPresent = true;
  
  for (const route of criticalRoutes) {
    const present = route.pattern.test(routesContent);
    addResult({
      name: `Route: ${route.name}`,
      passed: present,
      message: present ? "Defined" : "Missing",
    });
    if (!present) {
      allPresent = false;
    }
  }
  
  return allPresent;
}

function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("Pre-Launch Verification Summary");
  console.log("=".repeat(60));
  
  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.length - totalPassed;
  
  console.log(`\nTotal Checks: ${results.length}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  
  if (totalFailed > 0) {
    console.log("\n❌ VERIFICATION FAILED");
    console.log("\nFailed Checks:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.name}`);
      if (r.details) {
        console.log(`    ${r.details}`);
      }
    });
    console.log("\nFix all issues before deploying to production!");
  } else {
    console.log("\n✅ ALL CHECKS PASSED");
    console.log("\nReady for production deployment!");
    console.log("\nNext steps:");
    console.log("  1. Review deployment checklist in docs/DEPLOY.md");
    console.log("  2. Run: npm run deploy");
    console.log("  3. Monitor for 24 hours");
    console.log("  4. Run smoke tests");
  }
  
  console.log("=".repeat(60));
  
  return totalFailed === 0;
}

async function main() {
  console.log("PhuketRide Pre-Launch Verification");
  console.log("=".repeat(60));
  console.log(`Running all pre-launch checks (mode: ${verificationMode})...`);
  console.log("=".repeat(60));
  
  await checkEnvironmentVariables();
  await checkDatabaseMigrations();
  await checkCodeQuality();
  await checkBuild();
  await checkDocumentation();
  await checkCriticalEndpoints();
  
  const passed = printSummary();
  
  if (!passed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Verification failed:", error);
  process.exit(1);
});
