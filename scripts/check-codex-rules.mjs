#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const failures = [];
const warnings = [];
const failureSet = new Set();
const warningSet = new Set();
const VALIDATION_BASELINE_PATH = "scripts/codex-rules.validation-baseline.json";
const ADMIN_TOAST_BASELINE_PATH = "scripts/codex-rules.admin-toast-baseline.json";

function fail(message) {
  if (failureSet.has(message)) return;
  failureSet.add(message);
  failures.push(message);
}

function warn(message) {
  if (warningSet.has(message)) return;
  warningSet.add(message);
  warnings.push(message);
}

function readTrackedTextFile(filePath) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    warn(`Tracked file is missing on disk (likely staged/unstaged delete): ${filePath}`);
    return null;
  }
  return fs.readFileSync(fullPath, "utf8");
}

function getTrackedFiles() {
  const output = execSync("git ls-files", { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((filePath) => fs.existsSync(path.join(ROOT, filePath)));
}

function getUntrackedFiles() {
  const output = execSync("git ls-files --others --exclude-standard", { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isTextRuleTarget(filePath) {
  const ignoredPrefixes = [".react-router/", "build/", ".wrangler/", "node_modules/"];
  if (ignoredPrefixes.some((prefix) => filePath.startsWith(prefix))) {
    return false;
  }
  return /\.(ts|tsx|js|mjs|json|jsonc|md|txt|sql|css)$/.test(filePath);
}

function getMaxLines(filePath) {
  if (filePath === "scripts/check-codex-rules.mjs") return 650;
  if (filePath === "package-lock.json") return 10000;
  if (filePath.startsWith("app/routes/")) return 800;
  if (filePath.startsWith("app/features/")) return 800;
  if (filePath.startsWith("app/components/")) return 600;
  
  // Special exceptions for large documentation files
  if (filePath === "docs/README.md") return 800;
  if (filePath === "docs/OPTIMIZATION.md") return 800;
  if (filePath === "docs/DEPLOY.md") return 800;
  if (filePath.startsWith("docs/")) return 600;
  
  if (filePath.startsWith("scripts/")) return 500;
  if (filePath.startsWith("migrations/")) return 300;
  return 500;
}

function countLines(filePath) {
  const content = readTrackedTextFile(filePath);
  if (content === null) return null;
  if (content.length === 0) return 0;
  return content.split(/\r?\n/).length;
}

function checkFileLengths() {
  const trackedFiles = getTrackedFiles();

  for (const filePath of trackedFiles) {
    if (!isTextRuleTarget(filePath)) continue;
    const maxLines = getMaxLines(filePath);
    const lineCount = countLines(filePath);
    if (lineCount === null) continue;

    if (lineCount > maxLines) {
      fail(`File too long: ${filePath} (${lineCount} > ${maxLines})`);
    }
  }
}

function checkWranglerState() {
  const statePath = path.join(ROOT, ".wrangler", "state");
  if (fs.existsSync(statePath)) {
    warn("Local D1 state detected: .wrangler/state (remote D1 is source of truth; clean with `npm run clean:remote-only` when debugging is finished)");
  }
}

function checkPackageScripts() {
  const packagePath = path.join(ROOT, "package.json");
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const scripts = pkg.scripts ?? {};

  if (typeof scripts.lint !== "string" || scripts.lint.trim() === "") {
    fail("Missing required npm script: lint");
  }

  if (typeof scripts.test !== "string" || scripts.test.trim() === "") {
    fail("Missing required npm script: test");
  }

  if (typeof scripts["db:migrate:remote"] !== "string" || scripts["db:migrate:remote"].trim() === "") {
    fail("Missing required npm script: db:migrate:remote");
  } else {
    const migrateScript = scripts["db:migrate:remote"];
    if (!/wrangler\s+d1\s+migrations\s+apply/.test(migrateScript) || !/--remote/.test(migrateScript)) {
      fail("Script db:migrate:remote must run wrangler d1 migrations apply --remote");
    }
  }

  if (typeof scripts["clean:remote-only"] !== "string" || scripts["clean:remote-only"].trim() === "") {
    fail("Missing required npm script: clean:remote-only");
  }

  if (typeof scripts.deploy !== "string" || scripts.deploy.trim() === "") {
    fail("Missing required npm script: deploy");
  } else {
    const deployScript = scripts.deploy;
    const requiredPieces = ["rules:check", "typecheck", "db:migrate:remote", "wrangler deploy"];
    for (const piece of requiredPieces) {
      if (!deployScript.includes(piece)) {
        fail(`Deploy script must include: ${piece}`);
      }
    }
  }
}

function checkDocsLinks() {
  const requiredDocs = [
    "docs/README.md",
    "docs/DATABASE.md",
    "docs/OPTIMIZATION.md",
  ];

  for (const docPath of requiredDocs) {
    if (!fs.existsSync(path.join(ROOT, docPath))) {
      fail(`Missing required docs file: ${docPath}`);
    }
  }
}

function checkComponentBoundaries(trackedFiles) {
  const componentFiles = trackedFiles.filter((filePath) => /^app\/components\/.*\.(ts|tsx|js|jsx|mjs)$/.test(filePath));

  for (const filePath of componentFiles) {
    const content = readTrackedTextFile(filePath);
    if (content === null) continue;
    const isDashboardFile = filePath.startsWith("app/components/dashboard/");
    const isPublicFile = filePath.startsWith("app/components/public/");

    if (!isDashboardFile && !isPublicFile) continue;

    const importsPublic = /from\s+["'][^"']*(app\/components\/public|\/public\/|\.{1,2}\/.*public\/)/.test(content);
    const importsDashboard = /from\s+["'][^"']*(app\/components\/dashboard|\/dashboard\/|\.{1,2}\/.*dashboard\/)/.test(content);

    if (isDashboardFile && importsPublic) {
      fail(`Cross-layer import forbidden: ${filePath} imports public components`);
    }

    if (isPublicFile && importsDashboard) {
      fail(`Cross-layer import forbidden: ${filePath} imports dashboard components`);
    }
  }
}

function checkIconSources(trackedFiles) {
  const appCodeFiles = trackedFiles.filter((filePath) => /^app\/.*\.(ts|tsx|js|jsx|mjs)$/.test(filePath));
  const forbiddenIconImports = [
    "react-icons",
    "lucide-react",
    "phosphor-react",
    "@tabler/icons",
    "@tabler/icons-react",
  ];

  for (const filePath of appCodeFiles) {
    const content = readTrackedTextFile(filePath);
    if (content === null) continue;

    for (const forbiddenImport of forbiddenIconImports) {
      if (new RegExp(`from\\s+["']${forbiddenImport}`).test(content) || new RegExp(`from\\s+["']${forbiddenImport}\\/`).test(content)) {
        fail(`Forbidden icon library in ${filePath}: ${forbiddenImport}`);
      }
    }
  }
}

function checkImageRules(trackedFiles) {
  const imageRuleFiles = trackedFiles.filter((filePath) => /^(app|public)\/.*\.(ts|tsx|js|jsx|mjs|css)$/.test(filePath));

  for (const filePath of imageRuleFiles) {
    const content = readTrackedTextFile(filePath);
    if (content === null) continue;

    const hasInsecureUrlUsage =
      /(src|href)\s*=\s*["']http:\/\//.test(content) ||
      /url\(\s*["']?http:\/\//.test(content);

    if (hasInsecureUrlUsage) {
      fail(`Insecure http:// reference found in ${filePath}`);
    }

    if (filePath.startsWith("app/") && /\.(ts|tsx|js|jsx)$/.test(filePath)) {
      const imageTagRegex = /<img\b[\s\S]*?>/g;
      const tags = content.match(imageTagRegex) || [];

      for (const tag of tags) {
        if (!/\balt\s*=/.test(tag)) {
          fail(`Image tag without alt attribute in ${filePath}`);
          break;
        }
      }
    }
  }
}

function checkRoutingConsistency() {
  const routesConfigPath = path.join(ROOT, "app/routes.ts");
  if (!fs.existsSync(routesConfigPath)) {
    fail("Missing central routes config: app/routes.ts");
    return;
  }

  const content = fs.readFileSync(routesConfigPath, "utf8");
  const routeRefRegex = /(index|route|layout)\(\s*["'][^"']*["']\s*,\s*["']routes\/([^"']+)["']/g;
  const layoutRefRegex = /layout\(\s*["']routes\/([^"']+)["']/g;
  const routeModuleRefs = new Set();

  let match;
  while ((match = routeRefRegex.exec(content)) !== null) {
    routeModuleRefs.add(`app/routes/${match[2]}`);
  }
  while ((match = layoutRefRegex.exec(content)) !== null) {
    routeModuleRefs.add(`app/routes/${match[1]}`);
  }

  for (const moduleRef of routeModuleRefs) {
    if (!fs.existsSync(path.join(ROOT, moduleRef))) {
      fail(`Route module missing: ${moduleRef} (declared in app/routes.ts)`);
    }
  }
}

function checkMarkdownCreationRule() {
  const untracked = getUntrackedFiles();
  const untrackedMd = untracked.filter((filePath) => filePath.endsWith(".md"));

  for (const filePath of untrackedMd) {
    if (!filePath.startsWith("docs/")) {
      fail(`Untracked .md outside docs is forbidden: ${filePath}`);
    } else {
      warn(`New markdown detected in docs (requires direct approval): ${filePath}`);
    }
  }
}

function checkActionValidationWithBaseline(trackedFiles) {
  const baselinePath = path.join(ROOT, VALIDATION_BASELINE_PATH);
  if (!fs.existsSync(baselinePath)) {
    fail(`Missing validation baseline file: ${VALIDATION_BASELINE_PATH}`);
    return;
  }

  const baselineRaw = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const baselineList = Array.isArray(baselineRaw.actionInputWithoutSchema)
    ? baselineRaw.actionInputWithoutSchema
    : [];
  const baselineSet = new Set(baselineList);

  const routeFiles = trackedFiles.filter((filePath) => /^app\/routes\/.*\.tsx?$/.test(filePath));
  const offenders = [];

  for (const filePath of routeFiles) {
    const content = readTrackedTextFile(filePath);
    if (content === null) continue;
    const hasAction = /export\s+async\s+function\s+action\b/.test(content);
    if (!hasAction) continue;

    // Schema validation is required when action reads mutable request input.
    const readsActionInput = /request\.(formData|json|text)\s*\(/.test(content);
    if (!readsActionInput) continue;

    const hasServerValidationHelper =
      /from\s+["'][^"']*car-template-form\.server["']/.test(content) &&
      /\b(createCarTemplate|updateCarTemplate)\(/.test(content);

    const hasSchemaUsage =
      /from\s+["'][^"']*app\/schemas\//.test(content) ||
      /from\s+["']zod["']/.test(content) ||
      /\b\.safeParse\(/.test(content) ||
      /\bparseWithSchema\(/.test(content) ||
      hasServerValidationHelper;

    if (!hasSchemaUsage) {
      offenders.push(filePath);
      if (!baselineSet.has(filePath)) {
        fail(`Action validation missing schema (not in baseline): ${filePath}`);
      }
    }
  }

  for (const baselinePathItem of baselineSet) {
    if (!offenders.includes(baselinePathItem)) {
      warn(`Validation baseline entry can be removed: ${baselinePathItem}`);
    }
  }
}

function extractArrayBlock(content, startIndex) {
  const arrayStart = content.indexOf("[", startIndex);
  if (arrayStart === -1) return null;

  let depth = 0;
  for (let i = arrayStart; i < content.length; i++) {
    if (content[i] === "[") depth += 1;
    if (content[i] === "]") {
      depth -= 1;
      if (depth === 0) {
        return content.slice(arrayStart, i + 1);
      }
    }
  }
  return null;
}

function getAdminRouteModulesFromConfig() {
  const routesConfigPath = path.join(ROOT, "app/routes.ts");
  if (!fs.existsSync(routesConfigPath)) return [];
  const content = fs.readFileSync(routesConfigPath, "utf8");
  const layoutMarker = /layout\(\s*["']routes\/app-layout\.tsx["']\s*,/g;
  const markerMatch = layoutMarker.exec(content);
  if (!markerMatch) return [];

  const block = extractArrayBlock(content, markerMatch.index);
  if (!block) return [];

  const routeRegex = /route\(\s*["'][^"']*["']\s*,\s*["']routes\/([^"']+)["']/g;
  const modules = new Set();
  let match;
  while ((match = routeRegex.exec(block)) !== null) {
    modules.add(`app/routes/${match[1]}`);
  }
  return [...modules];
}

function checkAdminToastCoverage() {
  const baselinePath = path.join(ROOT, ADMIN_TOAST_BASELINE_PATH);
  if (!fs.existsSync(baselinePath)) {
    fail(`Missing admin toast baseline file: ${ADMIN_TOAST_BASELINE_PATH}`);
    return;
  }

  const baselineRaw = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const baselineList = Array.isArray(baselineRaw.adminRoutesWithoutToast)
    ? baselineRaw.adminRoutesWithoutToast
    : [];
  const baselineSet = new Set(baselineList);

  const adminModules = getAdminRouteModulesFromConfig();
  const offenders = [];

  for (const filePath of adminModules) {
    const fullPath = path.join(ROOT, filePath);
    if (!fs.existsSync(fullPath)) {
      fail(`Admin route module missing: ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    const hasToastHook =
      /\buseUrlToast\s*\(/.test(content) ||
      /\buseToast\s*\(/.test(content);

    if (!hasToastHook) {
      offenders.push(filePath);
      if (!baselineSet.has(filePath)) {
        fail(`Admin route without toast hook (not in baseline): ${filePath}`);
      }
    }

    if (/<table\b/.test(content)) {
      fail(`Raw <table> usage forbidden in admin routes: ${filePath}. Use shared dashboard table components.`);
    }
  }

  for (const baselinePathItem of baselineSet) {
    if (!offenders.includes(baselinePathItem)) {
      warn(`Admin toast baseline entry can be removed: ${baselinePathItem}`);
    }
  }
}

function checkSessionIntegrity() {
  const authPath = path.join(ROOT, "app/lib/auth.server.ts");
  if (!fs.existsSync(authPath)) {
    fail("Missing auth module: app/lib/auth.server.ts");
    return;
  }

  const content = fs.readFileSync(authPath, "utf8");
  if (!/SESSION_SECRET/.test(content)) {
    fail("Session secret support missing in app/lib/auth.server.ts");
  }
  if (!/createCookie\(\s*["']session["']/.test(content)) {
    fail("Session cookie factory missing in app/lib/auth.server.ts");
  }
  if (!/secrets:\s*getSessionSecrets\(\)/.test(content)) {
    fail("Session cookie must be signed with runtime secrets in app/lib/auth.server.ts");
  }
}

function checkSensitiveRouteGuards() {
  const adminOnlyRoutes = [
    "app/routes/companies.tsx",
    "app/routes/colors.tsx",
    "app/routes/colors_.new.tsx",
    "app/routes/colors_.$colorId.edit.tsx",
    "app/routes/districts.tsx",
    "app/routes/hotels.tsx",
    "app/routes/logs.tsx",
    "app/routes/reports.tsx",
    "app/routes/admin-companies.$companyId.tsx",
  ];

  for (const filePath of adminOnlyRoutes) {
    const fullPath = path.join(ROOT, filePath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf8");
    if (!/\b(requireAdmin|requireAdminAnalyticsAccess|requireAdminUserMutationAccess)\(/.test(content)) {
      fail(`Sensitive admin route must use requireAdmin: ${filePath}`);
    }
  }

  const ownershipRoutes = [
    {
      filePath: "app/routes/bookings.$id.tsx",
      marker: /\b(requireBookingAccess|validateBookingOwnership)\(/,
      message: "Booking details route must validate booking ownership",
    },
    {
      filePath: "app/routes/companies.$companyId.tsx",
      marker: /\bgetEffectiveCompanyId\(/,
      message: "Company detail route must resolve effective company access",
    },
  ];

  for (const rule of ownershipRoutes) {
    const fullPath = path.join(ROOT, rule.filePath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf8");
    
    // Check for delegated access validation in feature modules
    let hasDelegatedCheck = false;
    if (rule.filePath === "app/routes/companies.$companyId.tsx" && /loadCompanyDetailPage/.test(content)) {
      const loaderPath = path.join(ROOT, "app/features/company-detail/company-detail.loader.server.ts");
      hasDelegatedCheck = fs.existsSync(loaderPath) && /\bgetEffectiveCompanyId\(/.test(fs.readFileSync(loaderPath, "utf8"));
    } else if (rule.filePath === "app/routes/bookings.$id.tsx" && /loadBookingDetailPage/.test(content)) {
      const loaderPath = path.join(ROOT, "app/features/booking-detail/booking-detail.loader.server.ts");
      hasDelegatedCheck = fs.existsSync(loaderPath) && /\brequireBookingAccess\(/.test(fs.readFileSync(loaderPath, "utf8"));
    }
    
    if (!rule.marker.test(content) && !hasDelegatedCheck) {
      fail(`${rule.message}: ${rule.filePath}`);
    }
  }
}

function checkCheckoutIntegrity() {
  const checkoutPath = path.join(ROOT, "app/routes/cars.$id.checkout.tsx");
  if (!fs.existsSync(checkoutPath)) return;
  const routeContent = fs.readFileSync(checkoutPath, "utf8");
  const delegatedServicePath = path.join(
    ROOT,
    "app/features/public-checkout/public-checkout.service.server.ts",
  );
  const delegatedServiceContent = fs.existsSync(delegatedServicePath)
    ? fs.readFileSync(delegatedServicePath, "utf8")
    : "";
  const content = `${routeContent}\n${delegatedServiceContent}`;

  if (!/\bcalculateCheckoutPricing\(/.test(content)) {
    fail("Checkout action must recalculate pricing on the server: app/routes/cars.$id.checkout.tsx");
  }

  const forbiddenClientPriceFields = [
    "deliveryFee",
    "returnFee",
    "pickupAfterHoursFee",
    "returnAfterHoursFee",
    "baseTripCost",
    "salesTax",
    "selectedInsurance",
    "babySeatExtra",
    "islandTripExtra",
    "krabiTripExtra",
    "selectedTripTotal",
    "depositAmount",
  ];

  for (const fieldName of forbiddenClientPriceFields) {
    if (new RegExp(`name=["']${fieldName}["']`).test(content)) {
      fail(`Checkout form must not trust client price field "${fieldName}": app/routes/cars.$id.checkout.tsx`);
    }
  }
}

function checkTrackedEnvFiles() {
  if (fs.existsSync(path.join(ROOT, ".env"))) {
    warn("Tracked .env detected. Keep secrets out of git and use Cloudflare secrets/bindings.");
  }
}

function checkCloudflareBindingsConfig() {
  const wranglerPath = path.join(ROOT, "wrangler.jsonc");
  if (!fs.existsSync(wranglerPath)) return;
  const content = fs.readFileSync(wranglerPath, "utf8");
  const dbBindingBlock = content.match(/\{[\s\S]*?"binding"\s*:\s*"DB"[\s\S]*?\}/)?.[0] ?? "";

  if (!dbBindingBlock) fail("wrangler.jsonc must declare DB D1 binding");
  if (dbBindingBlock && !/"remote"\s*:\s*true/.test(dbBindingBlock)) fail("wrangler.jsonc DB binding must be remote-only (`remote: true`)");
  if (/"preview_database_id"\s*:/.test(dbBindingBlock)) fail("wrangler.jsonc DB binding must not declare preview_database_id in remote-only mode");
  if (!/"binding"\s*:\s*"ASSETS"/.test(content)) fail("wrangler.jsonc must declare ASSETS R2 binding");
  if (!/"binding"\s*:\s*"RATE_LIMIT"/.test(content)) warn("wrangler.jsonc does not declare RATE_LIMIT KV binding yet");
}

function checkLoaderSideEffects() {
  const routeFiles = getTrackedFiles()
    .filter((file) => file.startsWith("app/routes/") && file.endsWith(".tsx"))
    .map((file) => path.join(ROOT, file));
  const allowlisted = new Set([
    "app/routes/logout.tsx",
  ]);

  for (const filePath of routeFiles) {
    const relPath = path.relative(ROOT, filePath).replace(/\\/g, "/");
    if (allowlisted.has(relPath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    const loaderMatch = content.match(/export\s+async\s+function\s+loader[\s\S]*?(?=\nexport\s+(default|async function action|function|const|let|class)\b|$)/);
    if (!loaderMatch) continue;
    const loaderBody = loaderMatch[0];
    if (/\b(INSERT|UPDATE|DELETE)\b/i.test(loaderBody) || /\.run\(/.test(loaderBody)) {
      fail(`Loader must not perform write side effects: ${relPath}`);
    }
  }
}

function checkHotRouteTelemetry() {
  const requiredTelemetryRoutes = [
    "app/routes/dashboard-home.tsx",
    "app/routes/companies.tsx",
    "app/routes/cars.tsx",
    "app/routes/contracts.tsx",
    "app/routes/bookings.tsx",
    "app/routes/users.tsx",
    "app/routes/payments.tsx",
    "app/routes/cars.$id.checkout.tsx",
    "app/routes/api.metrics.dashboard-charts.tsx",
    "app/routes/api.metrics.operational.tsx",
  ];

  for (const filePath of requiredTelemetryRoutes) {
    const fullPath = path.join(ROOT, filePath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf8");
    const hasRouteHandler =
      /export\s+async\s+function\s+loader\b/.test(content) ||
      /export\s+async\s+function\s+action\b/.test(content);
    if (!hasRouteHandler) continue;

    const delegatesCheckoutTelemetry =
      filePath === "app/routes/cars.$id.checkout.tsx" &&
      /submitPublicCheckout|loadPublicCheckoutPage/.test(content) &&
      fs.existsSync(path.join(ROOT, "app/features/public-checkout/public-checkout.service.server.ts")) &&
      /\btrackServerOperation\s*\(/.test(
        fs.readFileSync(
          path.join(ROOT, "app/features/public-checkout/public-checkout.service.server.ts"),
          "utf8",
        ),
      );
    const importsTelemetry = /from\s+["'][^"']*telemetry\.server["']/.test(content);
    const usesTelemetry = /\btrackServerOperation\s*\(/.test(content);

    if ((!importsTelemetry || !usesTelemetry) && !delegatesCheckoutTelemetry) {
      fail(`Hot route must use trackServerOperation telemetry: ${filePath}`);
    }
  }
}

function main() {
  const trackedFiles = getTrackedFiles();

  checkFileLengths();
  checkWranglerState();
  checkPackageScripts();
  checkDocsLinks();
  checkComponentBoundaries(trackedFiles);
  checkIconSources(trackedFiles);
  checkImageRules(trackedFiles);
  checkRoutingConsistency();
  checkMarkdownCreationRule();
  checkActionValidationWithBaseline(trackedFiles);
  checkAdminToastCoverage();
  checkSessionIntegrity();
checkSensitiveRouteGuards();
checkCheckoutIntegrity();
checkTrackedEnvFiles();
checkCloudflareBindingsConfig();
checkLoaderSideEffects();
checkHotRouteTelemetry();

  if (failures.length > 0) {
    console.error("CODEX rules check failed:\n");
    for (const item of failures) {
      console.error(`- ${item}`);
    }
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn("CODEX rules warnings:\n");
    for (const item of warnings) {
      console.warn(`- ${item}`);
    }
    console.warn("");
  }

  console.log("CODEX rules check passed");
}

main();
