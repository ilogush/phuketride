/**
 * Validate Secrets Configuration
 * Ensures all required secrets are properly configured for deployment
 * 
 * Usage: tsx scripts/validate-secrets.ts [environment]
 */

type ValidationResult = {
  name: string;
  passed: boolean;
  message: string;
  severity: "critical" | "warning" | "info";
};

const results: ValidationResult[] = [];

function addResult(result: ValidationResult) {
  results.push(result);
  const icon = result.passed ? "✅" : result.severity === "critical" ? "❌" : "⚠️";
  console.log(`${icon} ${result.name}: ${result.message}`);
}

function validateSessionSecret() {
  console.log("\n🔐 Validating SESSION_SECRET...");
  
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (!sessionSecret) {
    addResult({
      name: "SESSION_SECRET exists",
      passed: false,
      message: "SESSION_SECRET environment variable is not set",
      severity: "critical",
    });
    return;
  }
  
  addResult({
    name: "SESSION_SECRET exists",
    passed: true,
    message: "SESSION_SECRET is configured",
    severity: "info",
  });
  
  // Check minimum length
  const minLength = 32;
  if (sessionSecret.length < minLength) {
    addResult({
      name: "SESSION_SECRET length",
      passed: false,
      message: `SESSION_SECRET must be at least ${minLength} characters (current: ${sessionSecret.length})`,
      severity: "critical",
    });
  } else {
    addResult({
      name: "SESSION_SECRET length",
      passed: true,
      message: `SESSION_SECRET length is sufficient (${sessionSecret.length} chars)`,
      severity: "info",
    });
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    "test",
    "secret",
    "password",
    "12345",
    "admin",
    "demo",
  ];
  
  const lowerSecret = sessionSecret.toLowerCase();
  const hasWeakPattern = weakPatterns.some((pattern) => lowerSecret.includes(pattern));
  
  if (hasWeakPattern) {
    addResult({
      name: "SESSION_SECRET strength",
      passed: false,
      message: "SESSION_SECRET contains common weak patterns",
      severity: "warning",
    });
  } else {
    addResult({
      name: "SESSION_SECRET strength",
      passed: true,
      message: "SESSION_SECRET does not contain obvious weak patterns",
      severity: "info",
    });
  }
  
  // Check entropy (basic check)
  const uniqueChars = new Set(sessionSecret).size;
  const entropyRatio = uniqueChars / sessionSecret.length;
  
  if (entropyRatio < 0.5) {
    addResult({
      name: "SESSION_SECRET entropy",
      passed: false,
      message: `Low entropy detected (${Math.round(entropyRatio * 100)}% unique chars)`,
      severity: "warning",
    });
  } else {
    addResult({
      name: "SESSION_SECRET entropy",
      passed: true,
      message: `Good entropy (${Math.round(entropyRatio * 100)}% unique chars)`,
      severity: "info",
    });
  }
}

function validateCloudflareCredentials() {
  console.log("\n☁️  Validating Cloudflare credentials...");
  
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  
  if (!apiToken) {
    addResult({
      name: "CLOUDFLARE_API_TOKEN",
      passed: false,
      message: "CLOUDFLARE_API_TOKEN is not set",
      severity: "critical",
    });
  } else {
    addResult({
      name: "CLOUDFLARE_API_TOKEN",
      passed: true,
      message: "CLOUDFLARE_API_TOKEN is configured",
      severity: "info",
    });
  }
  
  if (!accountId) {
    addResult({
      name: "CLOUDFLARE_ACCOUNT_ID",
      passed: false,
      message: "CLOUDFLARE_ACCOUNT_ID is not set",
      severity: "critical",
    });
  } else {
    addResult({
      name: "CLOUDFLARE_ACCOUNT_ID",
      passed: true,
      message: "CLOUDFLARE_ACCOUNT_ID is configured",
      severity: "info",
    });
  }
}

function validateEnvironment() {
  console.log("\n🌍 Validating environment...");
  
  const environment = process.argv[2] || process.env.ENVIRONMENT || "unknown";
  
  addResult({
    name: "Environment",
    passed: true,
    message: `Running validation for: ${environment}`,
    severity: "info",
  });
  
  if (environment === "production" || environment === "staging") {
    // Production/staging specific checks
    const nodeEnv = process.env.NODE_ENV;
    
    if (nodeEnv !== "production") {
      addResult({
        name: "NODE_ENV",
        passed: false,
        message: `NODE_ENV should be 'production' for ${environment} (current: ${nodeEnv})`,
        severity: "warning",
      });
    } else {
      addResult({
        name: "NODE_ENV",
        passed: true,
        message: "NODE_ENV is set to production",
        severity: "info",
      });
    }
  }
}

function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("Secrets Validation Summary");
  console.log("=".repeat(60));
  
  const critical = results.filter((r) => !r.passed && r.severity === "critical");
  const warnings = results.filter((r) => !r.passed && r.severity === "warning");
  const passed = results.filter((r) => r.passed);
  
  console.log(`\nPassed: ${passed.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Critical: ${critical.length}`);
  
  if (critical.length > 0) {
    console.log("\n❌ CRITICAL ISSUES:");
    critical.forEach((r) => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log("\n⚠️  WARNINGS:");
    warnings.forEach((r) => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }
  
  console.log("\n" + "=".repeat(60));
  
  if (critical.length > 0) {
    console.log("❌ Validation failed: Critical issues must be resolved");
    console.log("=".repeat(60));
    return false;
  } else if (warnings.length > 0) {
    console.log("⚠️  Validation passed with warnings");
    console.log("=".repeat(60));
    return true;
  } else {
    console.log("✅ All validations passed");
    console.log("=".repeat(60));
    return true;
  }
}

function main() {
  console.log("Secrets Validation");
  console.log("=".repeat(60));
  
  validateEnvironment();
  validateSessionSecret();
  validateCloudflareCredentials();
  
  const passed = printSummary();
  
  if (!passed) {
    console.log("\nFor help configuring secrets, see: .github/SECURITY_SETUP.md");
    process.exit(1);
  }
}

main();
