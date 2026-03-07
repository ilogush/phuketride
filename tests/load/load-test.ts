/**
 * Load testing script for PhuketRide
 * Tests critical endpoints under concurrent load
 * 
 * Usage: tsx tests/load/load-test.ts [endpoint]
 * 
 * Endpoints:
 * - dashboard-lists: Test cars/contracts/bookings lists
 * - checkout: Test public checkout flow
 * - all: Run all load tests
 */

type LoadTestResult = {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{ status: number; count: number }>;
};

type RequestResult = {
  success: boolean;
  responseTime: number;
  status: number;
  error?: string;
};

const BASE_URL = process.env.TEST_URL || "http://localhost:5173";
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || "50");
const REQUESTS_PER_USER = parseInt(process.env.REQUESTS_PER_USER || "10");

async function makeRequest(url: string, options?: RequestInit): Promise<RequestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "User-Agent": "LoadTest/1.0",
        ...options?.headers,
      },
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: response.ok,
      responseTime,
      status: response.status,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runConcurrentRequests(
  url: string,
  concurrentUsers: number,
  requestsPerUser: number,
  options?: RequestInit
): Promise<RequestResult[]> {
  const results: RequestResult[] = [];
  
  // Create user batches
  const userBatches = Array.from({ length: concurrentUsers }, (_, i) => i);
  
  // Run requests for each user concurrently
  await Promise.all(
    userBatches.map(async () => {
      for (let i = 0; i < requestsPerUser; i++) {
        const result = await makeRequest(url, options);
        results.push(result);
      }
    })
  );
  
  return results;
}

function calculateStats(results: RequestResult[]): Omit<LoadTestResult, "endpoint"> {
  const successfulRequests = results.filter((r) => r.success).length;
  const failedRequests = results.length - successfulRequests;
  
  const responseTimes = results.map((r) => r.responseTime).sort((a, b) => a - b);
  const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p99Index = Math.floor(responseTimes.length * 0.99);
  
  const p95ResponseTime = responseTimes[p95Index] || 0;
  const p99ResponseTime = responseTimes[p99Index] || 0;
  const minResponseTime = responseTimes[0] || 0;
  const maxResponseTime = responseTimes[responseTimes.length - 1] || 0;
  
  // Calculate requests per second (approximate)
  const totalTime = results.reduce((sum, r) => sum + r.responseTime, 0) / 1000;
  const requestsPerSecond = results.length / (totalTime / CONCURRENT_USERS);
  
  // Group errors by status code
  const errorMap = new Map<number, number>();
  results.filter((r) => !r.success).forEach((r) => {
    errorMap.set(r.status, (errorMap.get(r.status) || 0) + 1);
  });
  
  const errors = Array.from(errorMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));
  
  return {
    totalRequests: results.length,
    successfulRequests,
    failedRequests,
    averageResponseTime: Math.round(averageResponseTime),
    p95ResponseTime: Math.round(p95ResponseTime),
    p99ResponseTime: Math.round(p99ResponseTime),
    minResponseTime: Math.round(minResponseTime),
    maxResponseTime: Math.round(maxResponseTime),
    requestsPerSecond: Math.round(requestsPerSecond * 10) / 10,
    errors,
  };
}

function printResults(result: LoadTestResult) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Load Test Results: ${result.endpoint}`);
  console.log("=".repeat(60));
  console.log(`Total Requests:      ${result.totalRequests}`);
  console.log(`Successful:          ${result.successfulRequests} (${Math.round((result.successfulRequests / result.totalRequests) * 100)}%)`);
  console.log(`Failed:              ${result.failedRequests}`);
  console.log(`\nResponse Times (ms):`);
  console.log(`  Average:           ${result.averageResponseTime}ms`);
  console.log(`  Min:               ${result.minResponseTime}ms`);
  console.log(`  Max:               ${result.maxResponseTime}ms`);
  console.log(`  p95:               ${result.p95ResponseTime}ms`);
  console.log(`  p99:               ${result.p99ResponseTime}ms`);
  console.log(`\nThroughput:          ${result.requestsPerSecond} req/s`);
  
  if (result.errors.length > 0) {
    console.log(`\nErrors by Status:`);
    result.errors.forEach((e) => {
      console.log(`  ${e.status}: ${e.count} requests`);
    });
  }
  
  // Performance assessment
  console.log(`\nPerformance Assessment:`);
  const p95Target = 2000; // 2s target
  const errorRateTarget = 0.01; // 1% target
  
  const p95Pass = result.p95ResponseTime <= p95Target;
  const errorRatePass = (result.failedRequests / result.totalRequests) <= errorRateTarget;
  
  console.log(`  p95 < ${p95Target}ms:        ${p95Pass ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Error rate < 1%:    ${errorRatePass ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Overall:            ${p95Pass && errorRatePass ? "✅ PASS" : "❌ FAIL"}`);
  console.log("=".repeat(60));
}

async function testDashboardLists(): Promise<LoadTestResult> {
  console.log(`\nTesting Dashboard Lists (${CONCURRENT_USERS} users, ${REQUESTS_PER_USER} requests each)...`);
  
  // Test cars list endpoint
  const results = await runConcurrentRequests(
    `${BASE_URL}/cars?status=available`,
    CONCURRENT_USERS,
    REQUESTS_PER_USER
  );
  
  return {
    endpoint: "Dashboard Lists (/cars)",
    ...calculateStats(results),
  };
}

async function testCheckoutFlow(): Promise<LoadTestResult> {
  console.log(`\nTesting Checkout Flow (${CONCURRENT_USERS} users, ${REQUESTS_PER_USER} requests each)...`);
  
  // Test car detail page (simulates checkout entry)
  const results = await runConcurrentRequests(
    `${BASE_URL}/cars/1`,
    CONCURRENT_USERS,
    REQUESTS_PER_USER
  );
  
  return {
    endpoint: "Checkout Flow (/cars/:id)",
    ...calculateStats(results),
  };
}

async function testPublicHomepage(): Promise<LoadTestResult> {
  console.log(`\nTesting Public Homepage (${CONCURRENT_USERS} users, ${REQUESTS_PER_USER} requests each)...`);
  
  const results = await runConcurrentRequests(
    `${BASE_URL}/`,
    CONCURRENT_USERS,
    REQUESTS_PER_USER
  );
  
  return {
    endpoint: "Public Homepage (/)",
    ...calculateStats(results),
  };
}

async function testSearchCars(): Promise<LoadTestResult> {
  console.log(`\nTesting Search Cars (${CONCURRENT_USERS} users, ${REQUESTS_PER_USER} requests each)...`);
  
  const results = await runConcurrentRequests(
    `${BASE_URL}/search-cars?bodyType=sedan`,
    CONCURRENT_USERS,
    REQUESTS_PER_USER
  );
  
  return {
    endpoint: "Search Cars (/search-cars)",
    ...calculateStats(results),
  };
}

async function main() {
  const testType = process.argv[2] || "all";
  
  console.log("PhuketRide Load Testing");
  console.log("=".repeat(60));
  console.log(`Base URL:            ${BASE_URL}`);
  console.log(`Concurrent Users:    ${CONCURRENT_USERS}`);
  console.log(`Requests per User:   ${REQUESTS_PER_USER}`);
  console.log(`Total Requests:      ${CONCURRENT_USERS * REQUESTS_PER_USER}`);
  console.log("=".repeat(60));
  
  const results: LoadTestResult[] = [];
  
  if (testType === "all" || testType === "homepage") {
    const result = await testPublicHomepage();
    printResults(result);
    results.push(result);
  }
  
  if (testType === "all" || testType === "search") {
    const result = await testSearchCars();
    printResults(result);
    results.push(result);
  }
  
  if (testType === "all" || testType === "dashboard") {
    const result = await testDashboardLists();
    printResults(result);
    results.push(result);
  }
  
  if (testType === "all" || testType === "checkout") {
    const result = await testCheckoutFlow();
    printResults(result);
    results.push(result);
  }
  
  // Summary
  if (results.length > 1) {
    console.log(`\n${"=".repeat(60)}`);
    console.log("Overall Summary");
    console.log("=".repeat(60));
    
    const allPassed = results.every((r) => {
      const errorRate = r.failedRequests / r.totalRequests;
      return r.p95ResponseTime <= 2000 && errorRate <= 0.01;
    });
    
    console.log(`Tests Run:           ${results.length}`);
    console.log(`Overall Status:      ${allPassed ? "✅ ALL PASSED" : "❌ SOME FAILED"}`);
    console.log("=".repeat(60));
  }
}

main().catch((error) => {
  console.error("Load test failed:", error);
  process.exit(1);
});
