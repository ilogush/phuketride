import type { SessionUser } from "~/lib/auth.server";

type TelemetryLevel = "info" | "error";
type TelemetrySeverity = "info" | "warn" | "error";

type TelemetryBase = {
    event: string;
    scope: string;
    layer: string;
    operation: string;
    taxonomy: string;
    status: "ok" | "error";
    severity: TelemetrySeverity;
    durationMs: number;
    thresholdMs: number;
    slow: boolean;
    requestId?: string;
    path?: string;
    method?: string;
    userId?: string;
    companyId?: number | null;
    entityId?: number | string;
    details?: Record<string, unknown>;
    error?: string;
};

const SLOW_THRESHOLD_MS_BY_OPERATION: Record<string, number> = {
    loader: 300,
    action: 450,
    service: 400,
    repo: 250,
    api: 250,
};

function toSafeValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    const valueType = typeof value;
    if (valueType === "string" || valueType === "number" || valueType === "boolean") {
        return value;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        return value.slice(0, 50).map(toSafeValue);
    }
    if (valueType === "object") {
        const entries = Object.entries(value as Record<string, unknown>).slice(0, 50);
        return Object.fromEntries(entries.map(([key, nested]) => [key, toSafeValue(nested)]));
    }
    return String(value);
}

function normalizeDetails(details?: Record<string, unknown>) {
    if (!details) return undefined;
    return toSafeValue(details) as Record<string, unknown>;
}

function getTelemetryScopeMeta(scope: string) {
    const [layer = "unknown", operation = "unknown"] = scope.split(".");
    const thresholdMs = SLOW_THRESHOLD_MS_BY_OPERATION[operation] ?? 400;
    return {
        layer,
        operation,
        thresholdMs,
    };
}

function getEventTaxonomy(event: string, scope: string): string {
    const domain = event.split(".")[0] || "unknown";
    return `${domain}:${scope}`;
}

function logTelemetry(level: TelemetryLevel, payload: TelemetryBase) {
    const serialized = JSON.stringify({
        timestamp: new Date().toISOString(),
        ...payload,
    });

    if (level === "error") {
        console.error(serialized);
        return;
    }
    console.info(serialized);
}

export function getTelemetryRequestMeta(request?: Request) {
    if (!request) return {};

    const url = new URL(request.url);
    return {
        requestId:
            request.headers.get("cf-ray") ||
            request.headers.get("x-request-id") ||
            undefined,
        path: url.pathname,
        method: request.method,
    };
}

export async function trackServerOperation<T>(args: {
    event: string;
    scope: string;
    request?: Request;
    user?: SessionUser; // Enhanced typing
    userId?: string;
    companyId?: number | null;
    entityId?: number | string;
    details?: Record<string, unknown>;
    run: () => Promise<T>;
}) {
    const startedAt = Date.now();
    const requestMeta = getTelemetryRequestMeta(args.request);
    const scopeMeta = getTelemetryScopeMeta(args.scope);
    const taxonomy = getEventTaxonomy(args.event, args.scope);
    const normalizedDetails = normalizeDetails(args.details);

    const effectiveUserId = args.user?.id || args.userId;
    const effectiveCompanyId = args.user?.companyId || args.companyId;

    try {
        const result = await args.run();
        const durationMs = Date.now() - startedAt;
        const slow = durationMs >= scopeMeta.thresholdMs;
        logTelemetry("info", {
            event: args.event,
            scope: args.scope,
            layer: scopeMeta.layer,
            operation: scopeMeta.operation,
            taxonomy,
            status: "ok",
            severity: slow ? "warn" : "info",
            durationMs,
            thresholdMs: scopeMeta.thresholdMs,
            slow,
            userId: effectiveUserId,
            companyId: effectiveCompanyId,
            entityId: args.entityId,
            details: normalizedDetails,
            ...requestMeta,
        });
        return result;
    } catch (error) {
        const durationMs = Date.now() - startedAt;
        const slow = durationMs >= scopeMeta.thresholdMs;
        const message = error instanceof Error ? error.message : "Unknown telemetry error";
        logTelemetry("error", {
            event: args.event,
            scope: args.scope,
            layer: scopeMeta.layer,
            operation: scopeMeta.operation,
            taxonomy,
            status: "error",
            severity: "error",
            durationMs,
            thresholdMs: scopeMeta.thresholdMs,
            slow,
            userId: effectiveUserId,
            companyId: effectiveCompanyId,
            entityId: args.entityId,
            details: normalizedDetails,
            error: String(toSafeValue(message)),
            ...requestMeta,
        });
        throw error;
    }
}
export function logTelemetryEvent(level: TelemetryLevel, payload: Omit<TelemetryBase, "layer" | "operation" | "taxonomy" | "thresholdMs" | "slow" | "durationMs"> & { durationMs?: number }) {
    const scopeMeta = getTelemetryScopeMeta(payload.scope);
    const durationMs = payload.durationMs ?? 0;
    const slow = durationMs >= scopeMeta.thresholdMs;
    const taxonomy = getEventTaxonomy(payload.event, payload.scope);

    logTelemetry(level, {
        ...payload,
        layer: scopeMeta.layer,
        operation: scopeMeta.operation,
        taxonomy,
        durationMs,
        thresholdMs: scopeMeta.thresholdMs,
        slow,
        status: payload.status || "ok",
        severity: payload.severity || (level === "error" ? "error" : slow ? "warn" : "info"),
    });
}
