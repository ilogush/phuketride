import { logTelemetryEvent } from "./telemetry.server";

export type MonitoringMetric = {
  name: string;
  value: number;
  unit: "ms" | "count" | "percent" | "bytes";
  timestamp: number;
  tags?: Record<string, string>;
};

export type AlertLevel = "info" | "warning" | "critical";

export type Alert = {
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

/**
 * Monitoring thresholds
 */
export const MONITORING_THRESHOLDS = {
  // Response time thresholds (ms)
  RESPONSE_TIME_P95_WARNING: 2000,
  RESPONSE_TIME_P95_CRITICAL: 5000,
  RESPONSE_TIME_P99_WARNING: 3000,
  RESPONSE_TIME_P99_CRITICAL: 10000,
  
  // Error rate thresholds (percent)
  ERROR_RATE_WARNING: 1,
  ERROR_RATE_CRITICAL: 5,
  
  // Query time thresholds (ms)
  QUERY_TIME_WARNING: 500,
  QUERY_TIME_CRITICAL: 1000,
  
  // Storage thresholds (percent)
  STORAGE_WARNING: 80,
  STORAGE_CRITICAL: 90,
  
  // Memory thresholds (MB)
  MEMORY_WARNING: 100,
  MEMORY_CRITICAL: 120,
} as const;

/**
 * Check if a metric exceeds thresholds
 */
export function checkThreshold(
  metricName: string,
  value: number
): { exceeded: boolean; level?: AlertLevel; threshold?: number } {
  switch (metricName) {
    case "response_time_p95":
      if (value >= MONITORING_THRESHOLDS.RESPONSE_TIME_P95_CRITICAL) {
        return { exceeded: true, level: "critical", threshold: MONITORING_THRESHOLDS.RESPONSE_TIME_P95_CRITICAL };
      }
      if (value >= MONITORING_THRESHOLDS.RESPONSE_TIME_P95_WARNING) {
        return { exceeded: true, level: "warning", threshold: MONITORING_THRESHOLDS.RESPONSE_TIME_P95_WARNING };
      }
      break;
      
    case "error_rate":
      if (value >= MONITORING_THRESHOLDS.ERROR_RATE_CRITICAL) {
        return { exceeded: true, level: "critical", threshold: MONITORING_THRESHOLDS.ERROR_RATE_CRITICAL };
      }
      if (value >= MONITORING_THRESHOLDS.ERROR_RATE_WARNING) {
        return { exceeded: true, level: "warning", threshold: MONITORING_THRESHOLDS.ERROR_RATE_WARNING };
      }
      break;
      
    case "query_time":
      if (value >= MONITORING_THRESHOLDS.QUERY_TIME_CRITICAL) {
        return { exceeded: true, level: "critical", threshold: MONITORING_THRESHOLDS.QUERY_TIME_CRITICAL };
      }
      if (value >= MONITORING_THRESHOLDS.QUERY_TIME_WARNING) {
        return { exceeded: true, level: "warning", threshold: MONITORING_THRESHOLDS.QUERY_TIME_WARNING };
      }
      break;
  }
  
  return { exceeded: false };
}

/**
 * Create an alert
 */
export function createAlert(
  level: AlertLevel,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Alert {
  return {
    level,
    title,
    message,
    timestamp: Date.now(),
    metadata,
  };
}

/**
 * Log alert to console (in production, this would send to alerting service)
 */
export function logAlert(alert: Alert): void {
  const prefix = alert.level === "critical" ? "🚨" : alert.level === "warning" ? "⚠️" : "ℹ️";
  
  // Keep console log for quick debugging in worker console
  console.log(`${prefix} [${alert.level.toUpperCase()}] ${alert.title}: ${alert.message}`);

  // Send structured telemetry
  logTelemetryEvent(alert.level === "critical" ? "error" : "info", {
    event: "monitoring.alert",
    scope: "monitoring.service",
    severity: alert.level === "critical" ? "error" : alert.level === "warning" ? "warn" : "info",
    status: alert.level === "critical" ? "error" : "ok",
    details: {
      alertTitle: alert.title,
      alertMessage: alert.message,
      ...(alert.metadata || {})
    }
  });
}

/**
 * Record a monitoring metric
 */
export function recordMetric(metric: MonitoringMetric): void {
  // In production, this would send to monitoring service
  // For now, just check thresholds and alert if needed
  const check = checkThreshold(metric.name, metric.value);
  
  if (check.exceeded && check.level) {
    const alert = createAlert(
      check.level,
      `${metric.name} threshold exceeded`,
      `${metric.name} is ${metric.value}${metric.unit}, threshold is ${check.threshold}${metric.unit}`,
      { metric: metric.name, value: metric.value, threshold: check.threshold }
    );
    logAlert(alert);
  }
}

/**
 * Calculate error rate from telemetry
 */
export async function calculateErrorRate(
  db: D1Database,
  timeWindowMinutes: number = 60
): Promise<number> {
  const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();
  
  const result = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN severity = 'error' THEN 1 ELSE 0 END) as errors
    FROM telemetry_events
    WHERE created_at > ?
  `).bind(since).first() as { total: number; errors: number } | null;
  
  if (!result || result.total === 0) {
    return 0;
  }
  
  return (result.errors / result.total) * 100;
}

/**
 * Calculate p95 response time from telemetry
 */
export async function calculateP95ResponseTime(
  db: D1Database,
  timeWindowMinutes: number = 60
): Promise<number> {
  const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();
  
  const result = await db.prepare(`
    SELECT duration_ms
    FROM telemetry_events
    WHERE created_at > ? AND duration_ms IS NOT NULL
    ORDER BY duration_ms DESC
    LIMIT 1 OFFSET (
      SELECT CAST(COUNT(*) * 0.05 AS INTEGER)
      FROM telemetry_events
      WHERE created_at > ? AND duration_ms IS NOT NULL
    )
  `).bind(since, since).first() as { duration_ms: number } | null;
  
  return result?.duration_ms || 0;
}

/**
 * Get slow queries from telemetry
 */
export async function getSlowQueries(
  db: D1Database,
  thresholdMs: number = 1000,
  limit: number = 20
): Promise<Array<{ event: string; duration_ms: number; created_at: string }>> {
  const result = await db.prepare(`
    SELECT event, duration_ms, created_at
    FROM telemetry_events
    WHERE duration_ms > ?
    ORDER BY duration_ms DESC
    LIMIT ?
  `).bind(thresholdMs, limit).all();
  
  return (result.results || []) as Array<{ event: string; duration_ms: number; created_at: string }>;
}

/**
 * Health check endpoint data
 */
export type HealthCheckResult = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  checks: {
    database: boolean;
    storage: boolean;
    errorRate: number;
    p95ResponseTime: number;
  };
  version?: string;
};

/**
 * Perform health check
 */
export async function performHealthCheck(
  db: D1Database,
  r2: R2Bucket
): Promise<HealthCheckResult> {
  const checks = {
    database: false,
    storage: false,
    errorRate: 0,
    p95ResponseTime: 0,
  };
  
  // Check database
  try {
    await db.prepare("SELECT 1").first();
    checks.database = true;
  } catch (error) {
    console.error("Database health check failed:", error);
  }
  
  // Check storage
  try {
    await r2.head("health-check");
    checks.storage = true;
  } catch (error) {
    // R2 head on non-existent key returns null, not error
    checks.storage = true;
  }
  
  // Check error rate
  try {
    checks.errorRate = await calculateErrorRate(db, 60);
  } catch (error) {
    console.error("Error rate calculation failed:", error);
  }
  
  // Check p95 response time
  try {
    checks.p95ResponseTime = await calculateP95ResponseTime(db, 60);
  } catch (error) {
    console.error("P95 calculation failed:", error);
  }
  
  // Determine overall status
  let status: HealthCheckResult["status"] = "healthy";
  
  if (!checks.database || !checks.storage) {
    status = "unhealthy";
  } else if (
    checks.errorRate >= MONITORING_THRESHOLDS.ERROR_RATE_WARNING ||
    checks.p95ResponseTime >= MONITORING_THRESHOLDS.RESPONSE_TIME_P95_WARNING
  ) {
    status = "degraded";
  }
  
  return {
    status,
    timestamp: Date.now(),
    checks,
  };
}
