/**
 * Accessibility Audit Script
 * 
 * Automated checks for common accessibility issues
 * Run: npm run a11y:audit
 */

import * as fs from "fs";
import * as path from "path";

interface A11yIssue {
  file: string;
  line: number;
  severity: "critical" | "high" | "medium" | "low";
  rule: string;
  message: string;
  suggestion?: string;
}

const issues: A11yIssue[] = [];
const severityRank: Record<A11yIssue["severity"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function resolveFailLevel(): A11yIssue["severity"] {
  const raw = (process.env.A11Y_FAIL_LEVEL || "critical").toLowerCase();
  if (raw === "low" || raw === "medium" || raw === "high" || raw === "critical") {
    return raw;
  }
  return "critical";
}

function isPageLikeFile(file: string): boolean {
  return (
    file.startsWith("app/routes/") ||
    file.endsWith("PageView.tsx") ||
    file === "app/root.tsx"
  );
}

/**
 * Check for images without alt text
 */
function checkImageAlt(content: string, file: string): void {
  const lines = content.split("\n");
  
  lines.forEach((line, index) => {
    // Check for <img> without alt
    if (/<img[^>]*>/.test(line) && !/<img[^>]*alt=/.test(line)) {
      issues.push({
        file,
        line: index + 1,
        severity: "critical",
        rule: "img-alt",
        message: "Image missing alt attribute",
        suggestion: 'Add alt="" for decorative images or descriptive alt text',
      });
    }
  });
}

/**
 * Check for buttons without accessible labels
 */
function checkButtonLabels(content: string, file: string): void {
  const lines = content.split("\n");
  
  lines.forEach((line, index) => {
    // Check for icon-only buttons without aria-label
    if (
      /<button[^>]*>/.test(line) &&
      /<[A-Z][a-zA-Z]*Icon/.test(line) &&
      !/<button[^>]*aria-label=/.test(line) &&
      !/>[^<]+<\/button>/.test(line)
    ) {
      issues.push({
        file,
        line: index + 1,
        severity: "high",
        rule: "button-label",
        message: "Icon-only button missing aria-label",
        suggestion: 'Add aria-label="Description" to button',
      });
    }
  });
}

/**
 * Check for form inputs without labels
 */
function checkInputLabels(content: string, file: string): void {
  const lines = content.split("\n");
  
  lines.forEach((line, index) => {
    // Check for input without associated label
    if (
      /<input[^>]*>/.test(line) &&
      !/<input[^>]*aria-label=/.test(line) &&
      !/<input[^>]*aria-labelledby=/.test(line) &&
      !/type="hidden"/.test(line)
    ) {
      // Check if there's a label nearby (simple heuristic)
      const prevLine = lines[index - 1] || "";
      const nextLine = lines[index + 1] || "";
      
      if (!/<label/.test(prevLine) && !/<label/.test(nextLine)) {
        issues.push({
          file,
          line: index + 1,
          severity: "high",
          rule: "input-label",
          message: "Input missing associated label",
          suggestion: "Wrap input in <label> or add aria-label",
        });
      }
    }
  });
}

/**
 * Check for interactive elements with onClick but no keyboard support
 */
function checkKeyboardSupport(content: string, file: string): void {
  const lines = content.split("\n");
  
  lines.forEach((line, index) => {
    // Check for div/span with onClick but no role/tabIndex
    if (
      /<(div|span)[^>]*onClick/.test(line) &&
      !/<(div|span)[^>]*role=/.test(line) &&
      !/<(div|span)[^>]*tabIndex/.test(line)
    ) {
      issues.push({
        file,
        line: index + 1,
        severity: "high",
        rule: "keyboard-support",
        message: "Interactive element missing keyboard support",
        suggestion: 'Add role="button" and tabIndex={0}, or use <button>',
      });
    }
  });
}

/**
 * Check for color contrast issues (basic check)
 */
function checkColorContrast(content: string, file: string): void {
  const lines = content.split("\n");
  
  lines.forEach((line, index) => {
    // Check for light text on light background
    if (
      /text-gray-[123]00/.test(line) &&
      /bg-(white|gray-[12]00)/.test(line)
    ) {
      issues.push({
        file,
        line: index + 1,
        severity: "medium",
        rule: "color-contrast",
        message: "Potential color contrast issue",
        suggestion: "Use darker text colors (text-gray-700+) for better contrast",
      });
    }
  });
}

/**
 * Check for missing ARIA landmarks
 */
function checkLandmarks(content: string, file: string): void {
  if (file !== "app/root.tsx") {
    return;
  }

  // Check if file has main content but no <main> or role="main"
  if (
    content.includes("return") &&
    content.includes("<div") &&
    !content.includes("<main") &&
    !content.includes('role="main"')
  ) {
    issues.push({
      file,
      line: 1,
      severity: "medium",
      rule: "landmarks",
      message: "Page missing main landmark",
      suggestion: 'Wrap main content in <main> or add role="main"',
    });
  }
}

/**
 * Check for heading hierarchy
 */
function checkHeadingHierarchy(content: string, file: string): void {
  if (!isPageLikeFile(file)) {
    return;
  }

  const headings: Array<{ level: number; line: number }> = [];
  const lines = content.split("\n");
  
  lines.forEach((line, index) => {
    const match = line.match(/<h([1-6])/);
    if (match) {
      headings.push({
        level: parseInt(match[1]),
        line: index + 1,
      });
    }
  });
  
  // Check for skipped heading levels
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1];
    const curr = headings[i];
    
    if (curr.level - prev.level > 1) {
      issues.push({
        file,
        line: curr.line,
        severity: "medium",
        rule: "heading-hierarchy",
        message: `Heading level skipped (h${prev.level} to h${curr.level})`,
        suggestion: "Use sequential heading levels (h1, h2, h3, etc.)",
      });
    }
  }
}

/**
 * Scan directory for accessibility issues
 */
function scanDirectory(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
        scanDirectory(fullPath);
      }
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".jsx")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const relativePath = path.relative(process.cwd(), fullPath);
      
      checkImageAlt(content, relativePath);
      checkButtonLabels(content, relativePath);
      checkInputLabels(content, relativePath);
      checkKeyboardSupport(content, relativePath);
      checkColorContrast(content, relativePath);
      checkLandmarks(content, relativePath);
      checkHeadingHierarchy(content, relativePath);
    }
  }
}

/**
 * Generate report
 */
function generateReport(): void {
  console.log("\n=== Accessibility Audit Report ===\n");
  
  if (issues.length === 0) {
    console.log("✅ No accessibility issues found!\n");
    return;
  }
  
  // Group by severity
  const bySeverity = {
    critical: issues.filter((i) => i.severity === "critical"),
    high: issues.filter((i) => i.severity === "high"),
    medium: issues.filter((i) => i.severity === "medium"),
    low: issues.filter((i) => i.severity === "low"),
  };
  
  console.log(`Total issues: ${issues.length}\n`);
  console.log(`Critical: ${bySeverity.critical.length}`);
  console.log(`High: ${bySeverity.high.length}`);
  console.log(`Medium: ${bySeverity.medium.length}`);
  console.log(`Low: ${bySeverity.low.length}\n`);
  
  // Print issues by severity
  for (const [severity, severityIssues] of Object.entries(bySeverity)) {
    if (severityIssues.length === 0) continue;
    
    console.log(`\n## ${severity.toUpperCase()} (${severityIssues.length})\n`);
    
    for (const issue of severityIssues) {
      console.log(`${issue.file}:${issue.line}`);
      console.log(`  Rule: ${issue.rule}`);
      console.log(`  Message: ${issue.message}`);
      if (issue.suggestion) {
        console.log(`  Suggestion: ${issue.suggestion}`);
      }
      console.log();
    }
  }
  
  const failLevel = resolveFailLevel();
  const shouldFail = issues.some((issue) => severityRank[issue.severity] >= severityRank[failLevel]);
  if (shouldFail) {
    console.log(`\n❌ Accessibility threshold failed (A11Y_FAIL_LEVEL=${failLevel})\n`);
    process.exit(1);
  }
}

/**
 * Main
 */
function main(): void {
  console.log("Running accessibility audit...\n");
  
  // Scan app directory
  scanDirectory("app");
  
  // Generate report
  generateReport();
}

main();
