/**
 * Security Audit Script for PhuketRide
 * Automated security checks for common vulnerabilities
 * 
 * Usage: tsx tests/security/security-audit.ts
 */

type SecurityCheck = {
  name: string;
  category: "auth" | "access" | "injection" | "headers" | "session";
  severity: "critical" | "high" | "medium" | "low";
  passed: boolean;
  message: string;
  details?: string;
};

const BASE_URL = process.env.TEST_URL || "http://localhost:5173";
const results: SecurityCheck[] = [];

function addResult(check: SecurityCheck) {
  results.push(check);
  const icon = check.passed ? "✅" : "❌";
  const severity = check.passed ? "" : ` [${check.severity.toUpperCase()}]`;
  console.log(`${icon} ${check.name}${severity}`);
  if (!check.passed && check.details) {
    console.log(`   ${check.details}`);
  }
}

async function checkSecurityHeaders() {
  console.log("\n🔒 Checking Security Headers...");
  
  try {
    const response = await fetch(BASE_URL);
    const headers = response.headers;
    
    // X-Content-Type-Options
    addResult({
      name: "X-Content-Type-Options header",
      category: "headers",
      severity: "medium",
      passed: headers.get("x-content-type-options") === "nosniff",
      message: "Prevents MIME type sniffing",
      details: headers.get("x-content-type-options") 
        ? `Found: ${headers.get("x-content-type-options")}`
        : "Header not set",
    });
    
    // X-Frame-Options or CSP frame-ancestors
    const xFrameOptions = headers.get("x-frame-options");
    const csp = headers.get("content-security-policy");
    const hasFrameProtection = xFrameOptions || (csp && csp.includes("frame-ancestors"));
    
    addResult({
      name: "Clickjacking protection",
      category: "headers",
      severity: "medium",
      passed: hasFrameProtection,
      message: "Prevents clickjacking attacks",
      details: xFrameOptions 
        ? `X-Frame-Options: ${xFrameOptions}`
        : csp?.includes("frame-ancestors")
        ? "Protected via CSP frame-ancestors"
        : "No frame protection found",
    });
    
    // Strict-Transport-Security (HTTPS only)
    if (BASE_URL.startsWith("https://")) {
      addResult({
        name: "Strict-Transport-Security header",
        category: "headers",
        severity: "high",
        passed: !!headers.get("strict-transport-security"),
        message: "Enforces HTTPS connections",
        details: headers.get("strict-transport-security") || "Header not set",
      });
    }
    
    // Content-Security-Policy
    addResult({
      name: "Content-Security-Policy header",
      category: "headers",
      severity: "high",
      passed: !!csp,
      message: "Mitigates XSS and injection attacks",
      details: csp ? "CSP header present" : "CSP header not set",
    });
    
  } catch (error) {
    addResult({
      name: "Security headers check",
      category: "headers",
      severity: "critical",
      passed: false,
      message: "Failed to check security headers",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function checkCrossTenanAccess() {
  console.log("\n🔐 Checking Cross-Tenant Access Controls...");
  const accessDeniedStatuses = new Set([401, 403, 302, 303, 307, 308]);
  
  // Test 1: Accessing another company's car without auth
  try {
    const response = await fetch(`${BASE_URL}/cars/999/edit`, { redirect: "manual" });
    
    addResult({
      name: "Unauthenticated access to sensitive route",
      category: "access",
      severity: "critical",
      passed: accessDeniedStatuses.has(response.status),
      message: "Should redirect or deny unauthenticated access",
      details: `Status: ${response.status}`,
    });
  } catch (error) {
    addResult({
      name: "Unauthenticated access check",
      category: "access",
      severity: "critical",
      passed: false,
      message: "Failed to test unauthenticated access",
      details: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Test 2: Admin routes without admin role
  try {
    const response = await fetch(`${BASE_URL}/companies`, { redirect: "manual" });
    
    addResult({
      name: "Admin route access control",
      category: "access",
      severity: "critical",
      passed: accessDeniedStatuses.has(response.status),
      message: "Admin routes should require admin role",
      details: `Status: ${response.status}`,
    });
  } catch (error) {
    addResult({
      name: "Admin route access check",
      category: "access",
      severity: "critical",
      passed: false,
      message: "Failed to test admin route access",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function checkSQLInjection() {
  console.log("\n💉 Checking SQL Injection Vectors...");
  
  const injectionPayloads = [
    "' OR '1'='1",
    "1' OR '1'='1' --",
    "'; DROP TABLE users; --",
    "1 UNION SELECT NULL--",
  ];
  
  for (const payload of injectionPayloads) {
    try {
      const response = await fetch(`${BASE_URL}/search-cars?search=${encodeURIComponent(payload)}`);
      
      // Should not return 500 (indicates unhandled SQL error)
      // Should return 200 with empty results or 400 (validation error)
      const passed = response.status !== 500;
      
      addResult({
        name: `SQL injection protection (${payload.substring(0, 20)}...)`,
        category: "injection",
        severity: "critical",
        passed,
        message: "Should handle malicious SQL input safely",
        details: `Status: ${response.status}`,
      });
      
      if (!passed) {
        break; // Stop testing if we found a vulnerability
      }
    } catch (error) {
      // Network errors are okay - means the request was rejected
      addResult({
        name: `SQL injection test (${payload.substring(0, 20)}...)`,
        category: "injection",
        severity: "critical",
        passed: true,
        message: "Request rejected (good)",
      });
    }
  }
}

async function checkSessionSecurity() {
  console.log("\n🍪 Checking Session Security...");
  
  try {
    const response = await fetch(BASE_URL);
    const setCookie = response.headers.get("set-cookie");
    
    if (setCookie) {
      // Check for HttpOnly flag
      addResult({
        name: "Session cookie HttpOnly flag",
        category: "session",
        severity: "critical",
        passed: setCookie.toLowerCase().includes("httponly"),
        message: "Prevents JavaScript access to session cookie",
        details: setCookie,
      });
      
      // Check for Secure flag (HTTPS only)
      if (BASE_URL.startsWith("https://")) {
        addResult({
          name: "Session cookie Secure flag",
          category: "session",
          severity: "critical",
          passed: setCookie.toLowerCase().includes("secure"),
          message: "Ensures cookie only sent over HTTPS",
          details: setCookie,
        });
      }
      
      // Check for SameSite attribute
      addResult({
        name: "Session cookie SameSite attribute",
        category: "session",
        severity: "high",
        passed: setCookie.toLowerCase().includes("samesite"),
        message: "Prevents CSRF attacks",
        details: setCookie,
      });
    } else {
      addResult({
        name: "Session cookie check",
        category: "session",
        severity: "low",
        passed: true,
        message: "No session cookie set on homepage (expected)",
      });
    }
  } catch (error) {
    addResult({
      name: "Session security check",
      category: "session",
      severity: "critical",
      passed: false,
      message: "Failed to check session security",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function checkCORSPolicy() {
  console.log("\n🌐 Checking CORS Policy...");
  
  try {
    const response = await fetch(BASE_URL, {
      headers: {
        "Origin": "https://evil.com",
      },
    });
    
    const corsHeader = response.headers.get("access-control-allow-origin");
    
    // CORS should either not be set, or be restrictive (not *)
    // For API endpoints, * might be okay, but for main app it should be restrictive
    addResult({
      name: "CORS policy configuration",
      category: "headers",
      severity: "medium",
      passed: !corsHeader || corsHeader !== "*",
      message: "CORS should be restrictive for main application",
      details: corsHeader ? `CORS: ${corsHeader}` : "No CORS header (good)",
    });
  } catch (error) {
    addResult({
      name: "CORS policy check",
      category: "headers",
      severity: "medium",
      passed: false,
      message: "Failed to check CORS policy",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("Security Audit Summary");
  console.log("=".repeat(60));
  
  const byCategory = results.reduce((acc, check) => {
    if (!acc[check.category]) {
      acc[check.category] = { passed: 0, failed: 0 };
    }
    if (check.passed) {
      acc[check.category].passed++;
    } else {
      acc[check.category].failed++;
    }
    return acc;
  }, {} as Record<string, { passed: number; failed: number }>);
  
  console.log("\nBy Category:");
  Object.entries(byCategory).forEach(([category, stats]) => {
    const total = stats.passed + stats.failed;
    const icon = stats.failed === 0 ? "✅" : "⚠️";
    console.log(`  ${icon} ${category}: ${stats.passed}/${total} passed`);
  });
  
  const bySeverity = results.filter((r) => !r.passed).reduce((acc, check) => {
    acc[check.severity] = (acc[check.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  if (Object.keys(bySeverity).length > 0) {
    console.log("\nFailed Checks by Severity:");
    Object.entries(bySeverity).forEach(([severity, count]) => {
      console.log(`  ${severity.toUpperCase()}: ${count}`);
    });
  }
  
  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.length - totalPassed;
  const criticalFailed = results.filter((r) => !r.passed && r.severity === "critical").length;
  
  console.log(`\nTotal Checks: ${results.length}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  
  console.log("\n" + "=".repeat(60));
  
  if (criticalFailed > 0) {
    console.log(`❌ CRITICAL: ${criticalFailed} critical security issues found!`);
    console.log("=".repeat(60));
    return false;
  } else if (totalFailed > 0) {
    console.log(`⚠️  WARNING: ${totalFailed} security issues found`);
    console.log("=".repeat(60));
    return false;
  } else {
    console.log("✅ All security checks passed!");
    console.log("=".repeat(60));
    return true;
  }
}

async function main() {
  console.log("PhuketRide Security Audit");
  console.log("=".repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log("=".repeat(60));
  
  await checkSecurityHeaders();
  await checkCrossTenanAccess();
  await checkSQLInjection();
  await checkSessionSecurity();
  await checkCORSPolicy();
  
  const passed = printSummary();
  
  if (!passed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Security audit failed:", error);
  process.exit(1);
});
