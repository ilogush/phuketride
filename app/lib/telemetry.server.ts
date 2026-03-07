type TelemetryLevel = "info" | "error";

type TelemetryBase = {
    event: string;
    scope: string;
    status: "ok" | "error";
    durationMs: number;
    requestId?: string;
    path?: string;
    method?: string;
    userId?: string;
    companyId?: number | null;
    entityId?: number | string;
    details?: Record<string, unknown>;
    error?: string;
};

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
    userId?: string;
    companyId?: number | null;
    entityId?: number | string;
    details?: Record<string, unknown>;
    run: () => Promise<T>;
}) {
    const startedAt = Date.now();
    const requestMeta = getTelemetryRequestMeta(args.request);

    try {
        const result = await args.run();
        logTelemetry("info", {
            event: args.event,
            scope: args.scope,
            status: "ok",
            durationMs: Date.now() - startedAt,
            userId: args.userId,
            companyId: args.companyId,
            entityId: args.entityId,
            details: args.details,
            ...requestMeta,
        });
        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown telemetry error";
        logTelemetry("error", {
            event: args.event,
            scope: args.scope,
            status: "error",
            durationMs: Date.now() - startedAt,
            userId: args.userId,
            companyId: args.companyId,
            entityId: args.entityId,
            details: args.details,
            error: message,
            ...requestMeta,
        });
        throw error;
    }
}
