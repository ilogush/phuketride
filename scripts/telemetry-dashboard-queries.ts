/**
 * Telemetry Dashboard Queries
 * 
 * Collection of queries for analyzing telemetry data in Cloudflare Analytics
 * These queries can be used to create custom dashboards and alerts
 */

/**
 * Query Templates for Cloudflare Analytics
 * 
 * To use these queries:
 * 1. Go to Cloudflare Dashboard > Analytics & Logs > Logs
 * 2. Use these queries in the LogPush or Analytics API
 * 3. Create custom dashboards with these metrics
 */

export const TELEMETRY_QUERIES = {
  /**
   * Performance Dashboard Queries
   */
  performance: {
    // P50, P95, P99 response times by endpoint
    responseTimePercentiles: `
      SELECT
        path,
        APPROX_QUANTILES(durationMs, 100)[OFFSET(50)] as p50,
        APPROX_QUANTILES(durationMs, 100)[OFFSET(95)] as p95,
        APPROX_QUANTILES(durationMs, 100)[OFFSET(99)] as p99,
        COUNT(*) as request_count
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
        AND status = 'ok'
      GROUP BY path
      ORDER BY request_count DESC
      LIMIT 20
    `,

    // Slow operations (above threshold)
    slowOperations: `
      SELECT
        event,
        scope,
        layer,
        operation,
        AVG(durationMs) as avg_duration,
        MAX(durationMs) as max_duration,
        COUNT(*) as slow_count
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
        AND slow = true
      GROUP BY event, scope, layer, operation
      ORDER BY slow_count DESC
      LIMIT 50
    `,

    // Response time trend (hourly)
    responseTimeTrend: `
      SELECT
        TIMESTAMP_TRUNC(timestamp, HOUR) as hour,
        APPROX_QUANTILES(durationMs, 100)[OFFSET(50)] as p50,
        APPROX_QUANTILES(durationMs, 100)[OFFSET(95)] as p95,
        COUNT(*) as request_count
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        AND status = 'ok'
      GROUP BY hour
      ORDER BY hour DESC
    `,

    // Top slowest endpoints
    slowestEndpoints: `
      SELECT
        path,
        method,
        AVG(durationMs) as avg_duration,
        MAX(durationMs) as max_duration,
        COUNT(*) as request_count
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
        AND status = 'ok'
      GROUP BY path, method
      ORDER BY avg_duration DESC
      LIMIT 20
    `,
  },

  /**
   * Error Rate Dashboard Queries
   */
  errors: {
    // Overall error rate
    errorRate: `
      SELECT
        TIMESTAMP_TRUNC(timestamp, MINUTE) as minute,
        COUNTIF(status = 'error') as error_count,
        COUNT(*) as total_count,
        SAFE_DIVIDE(COUNTIF(status = 'error'), COUNT(*)) * 100 as error_rate_pct
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
      GROUP BY minute
      ORDER BY minute DESC
    `,

    // Errors by endpoint
    errorsByEndpoint: `
      SELECT
        path,
        method,
        COUNT(*) as error_count,
        ARRAY_AGG(DISTINCT error LIMIT 5) as error_messages
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
        AND status = 'error'
      GROUP BY path, method
      ORDER BY error_count DESC
      LIMIT 20
    `,

    // Errors by event type
    errorsByEvent: `
      SELECT
        event,
        scope,
        COUNT(*) as error_count,
        ARRAY_AGG(DISTINCT error LIMIT 5) as error_messages
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
        AND status = 'error'
      GROUP BY event, scope
      ORDER BY error_count DESC
      LIMIT 20
    `,

    // Error trend (hourly)
    errorTrend: `
      SELECT
        TIMESTAMP_TRUNC(timestamp, HOUR) as hour,
        COUNT(*) as error_count,
        ARRAY_AGG(DISTINCT event LIMIT 10) as error_events
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        AND status = 'error'
      GROUP BY hour
      ORDER BY hour DESC
    `,
  },

  /**
   * Business Metrics Dashboard Queries
   */
  business: {
    // Bookings created (hourly)
    bookingsCreated: `
      SELECT
        TIMESTAMP_TRUNC(timestamp, HOUR) as hour,
        COUNT(*) as booking_count,
        COUNT(DISTINCT companyId) as company_count
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        AND event = 'bookings.create'
        AND status = 'ok'
      GROUP BY hour
      ORDER BY hour DESC
    `,

    // Contracts signed (hourly)
    contractsSigned: `
      SELECT
        TIMESTAMP_TRUNC(timestamp, HOUR) as hour,
        COUNT(*) as contract_count,
        COUNT(DISTINCT companyId) as company_count
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        AND event = 'contracts.create'
        AND status = 'ok'
      GROUP BY hour
      ORDER BY hour DESC
    `,

    // Active users (unique per hour)
    activeUsers: `
      SELECT
        TIMESTAMP_TRUNC(timestamp, HOUR) as hour,
        COUNT(DISTINCT userId) as active_users,
        COUNT(*) as request_count
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        AND userId IS NOT NULL
      GROUP BY hour
      ORDER BY hour DESC
    `,

    // Company activity
    companyActivity: `
      SELECT
        companyId,
        COUNT(*) as request_count,
        COUNT(DISTINCT userId) as active_users,
        COUNTIF(event LIKE 'bookings.%') as booking_operations,
        COUNTIF(event LIKE 'contracts.%') as contract_operations
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        AND companyId IS NOT NULL
      GROUP BY companyId
      ORDER BY request_count DESC
      LIMIT 20
    `,
  },

  /**
   * Infrastructure Metrics
   */
  infrastructure: {
    // Request volume by layer
    requestsByLayer: `
      SELECT
        layer,
        operation,
        COUNT(*) as request_count,
        AVG(durationMs) as avg_duration
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
      GROUP BY layer, operation
      ORDER BY request_count DESC
    `,

    // Taxonomy distribution
    taxonomyDistribution: `
      SELECT
        taxonomy,
        COUNT(*) as request_count,
        COUNTIF(status = 'error') as error_count,
        COUNTIF(slow = true) as slow_count
      FROM telemetry_logs
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
      GROUP BY taxonomy
      ORDER BY request_count DESC
      LIMIT 30
    `,
  },
};

/**
 * Alert Thresholds
 * 
 * Configure these in Cloudflare Notifications
 */
export const ALERT_THRESHOLDS = {
  // Critical (P0)
  critical: {
    errorRate: 5, // > 5% error rate
    p95ResponseTime: 5000, // > 5s p95 response time
    uptime: 99, // < 99% uptime
  },

  // High (P1)
  high: {
    errorRate: 2, // > 2% error rate
    p95ResponseTime: 3000, // > 3s p95 response time
    storageUsage: 90, // > 90% storage usage
  },

  // Medium (P2)
  medium: {
    errorRate: 1, // > 1% error rate
    p95ResponseTime: 2000, // > 2s p95 response time
    cacheHitRatio: 80, // < 80% cache hit ratio
  },
};

/**
 * Dashboard Configuration
 * 
 * Recommended dashboard layout for Cloudflare Analytics
 */
export const DASHBOARD_CONFIG = {
  // Main Performance Dashboard
  performance: {
    name: "Performance Overview",
    widgets: [
      {
        type: "line_chart",
        title: "Response Time (P50/P95/P99)",
        query: TELEMETRY_QUERIES.performance.responseTimeTrend,
        refreshInterval: 60, // seconds
      },
      {
        type: "table",
        title: "Slowest Endpoints",
        query: TELEMETRY_QUERIES.performance.slowestEndpoints,
        refreshInterval: 300,
      },
      {
        type: "table",
        title: "Slow Operations",
        query: TELEMETRY_QUERIES.performance.slowOperations,
        refreshInterval: 300,
      },
    ],
  },

  // Error Monitoring Dashboard
  errors: {
    name: "Error Monitoring",
    widgets: [
      {
        type: "line_chart",
        title: "Error Rate (%)",
        query: TELEMETRY_QUERIES.errors.errorRate,
        refreshInterval: 60,
      },
      {
        type: "table",
        title: "Errors by Endpoint",
        query: TELEMETRY_QUERIES.errors.errorsByEndpoint,
        refreshInterval: 300,
      },
      {
        type: "table",
        title: "Errors by Event",
        query: TELEMETRY_QUERIES.errors.errorsByEvent,
        refreshInterval: 300,
      },
    ],
  },

  // Business Metrics Dashboard
  business: {
    name: "Business Metrics",
    widgets: [
      {
        type: "line_chart",
        title: "Bookings Created",
        query: TELEMETRY_QUERIES.business.bookingsCreated,
        refreshInterval: 300,
      },
      {
        type: "line_chart",
        title: "Contracts Signed",
        query: TELEMETRY_QUERIES.business.contractsSigned,
        refreshInterval: 300,
      },
      {
        type: "line_chart",
        title: "Active Users",
        query: TELEMETRY_QUERIES.business.activeUsers,
        refreshInterval: 300,
      },
      {
        type: "table",
        title: "Company Activity",
        query: TELEMETRY_QUERIES.business.companyActivity,
        refreshInterval: 600,
      },
    ],
  },
};

/**
 * Export queries for use in Cloudflare Workers Analytics Engine
 */
export function getQueryForMetric(metric: string): string | undefined {
  const [category, name] = metric.split(".");
  const categoryQueries = TELEMETRY_QUERIES[category as keyof typeof TELEMETRY_QUERIES];
  if (!categoryQueries) return undefined;
  return categoryQueries[name as keyof typeof categoryQueries];
}

/**
 * Print all queries for documentation
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("=== Telemetry Dashboard Queries ===\n");
  
  for (const [category, queries] of Object.entries(TELEMETRY_QUERIES)) {
    console.log(`\n## ${category.toUpperCase()}\n`);
    for (const [name, query] of Object.entries(queries)) {
      console.log(`### ${name}`);
      console.log(query.trim());
      console.log();
    }
  }
}
