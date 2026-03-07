import test from "node:test";
import assert from "node:assert/strict";
import { getTelemetryRequestMeta, trackServerOperation } from "../app/lib/telemetry.server";

test("getTelemetryRequestMeta extracts request metadata", () => {
    const meta = getTelemetryRequestMeta(new Request("https://example.com/settings?tab=general", {
        method: "POST",
        headers: {
            "cf-ray": "abc123",
        },
    }));

    assert.deepEqual(meta, {
        requestId: "abc123",
        path: "/settings",
        method: "POST",
    });
});

test("trackServerOperation logs ok status and returns result", async () => {
    const logs: string[] = [];
    const originalInfo = console.info;
    console.info = (value?: unknown) => {
        logs.push(String(value));
    };

    try {
        const result = await trackServerOperation({
            event: "settings.load",
            scope: "route.loader",
            request: new Request("https://example.com/settings"),
            userId: "manager-1",
            companyId: 12,
            run: async () => "ok",
        });

        assert.equal(result, "ok");
        assert.equal(logs.length, 1);
        const payload = JSON.parse(logs[0]) as Record<string, unknown>;
        assert.equal(payload.event, "settings.load");
        assert.equal(payload.scope, "route.loader");
        assert.equal(payload.status, "ok");
        assert.equal(payload.path, "/settings");
    } finally {
        console.info = originalInfo;
    }
});

test("trackServerOperation logs error status and rethrows", async () => {
    const logs: string[] = [];
    const originalError = console.error;
    console.error = (value?: unknown) => {
        logs.push(String(value));
    };

    try {
        await assert.rejects(
            () => trackServerOperation({
                event: "public.checkout.submit",
                scope: "route.action",
                request: new Request("https://example.com/checkout"),
                entityId: 55,
                run: async () => {
                    throw new Error("boom");
                },
            }),
            /boom/
        );

        assert.equal(logs.length, 1);
        const payload = JSON.parse(logs[0]) as Record<string, unknown>;
        assert.equal(payload.status, "error");
        assert.equal(payload.event, "public.checkout.submit");
        assert.equal(payload.error, "boom");
    } finally {
        console.error = originalError;
    }
});
