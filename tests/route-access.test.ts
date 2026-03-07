import test from "node:test";
import assert from "node:assert/strict";
import { loader as logsLoader, action as logsAction } from "../app/routes/logs";
import { loader as companyLoader } from "../app/routes/companies.$companyId";
import { loader as locationsLoader, action as locationsAction } from "../app/routes/locations";
import { requireBookingAccess } from "../app/lib/access-policy.server";
import { serializeSession, type SessionUser } from "../app/lib/auth.server";
import { setRuntimeEnv } from "../app/lib/runtime-env.server";
import { FakeD1Database } from "./helpers/fake-d1";

async function buildRequest(user: SessionUser, url: string, init?: RequestInit) {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "test");
    const baseRequest = new Request(url, init);
    const cookie = await serializeSession(baseRequest, user);
    return new Request(url, {
        ...init,
        headers: {
            ...(init?.headers || {}),
            Cookie: cookie,
        },
    });
}

test("logs loader rejects non-admin before touching DB", async () => {
    const db = new FakeD1Database([]);
    const request = await buildRequest(
        {
            id: "partner-1",
            email: "partner@example.com",
            role: "partner",
            name: "Partner",
            surname: null,
            companyId: 12,
        },
        "https://example.com/logs"
    );

    await assert.rejects(
        () => logsLoader({
            request,
            context: { cloudflare: { env: { DB: db as unknown as D1Database } } },
            params: {},
        } as never),
        (error: unknown) => error instanceof Response && error.status === 403
    );
    assert.equal(db.calls.length, 0);
});

test("logs action rejects non-admin clear request", async () => {
    const db = new FakeD1Database([]);
    const body = new URLSearchParams({ intent: "clear" });
    const request = await buildRequest(
        {
            id: "partner-1",
            email: "partner@example.com",
            role: "partner",
            name: "Partner",
            surname: null,
            companyId: 12,
        },
        "https://example.com/logs",
        {
            method: "POST",
            body,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
    );

    await assert.rejects(
        () => logsAction({
            request,
            context: { cloudflare: { env: { DB: db as unknown as D1Database } } },
            params: {},
        } as never),
        (error: unknown) => error instanceof Response && error.status === 403
    );
    assert.equal(db.calls.length, 0);
});

test("company detail loader rejects manager accessing another company", async () => {
    const db = new FakeD1Database([]);
    const request = await buildRequest(
        {
            id: "manager-1",
            email: "manager@example.com",
            role: "manager",
            name: "Manager",
            surname: null,
            companyId: 12,
        },
        "https://example.com/companies/99"
    );

    await assert.rejects(
        () => companyLoader({
            request,
            context: { cloudflare: { env: { DB: db as unknown as D1Database } } },
            params: { companyId: "99" },
        } as never),
        (error: unknown) => error instanceof Response && error.status === 403
    );
    assert.equal(db.calls.length, 0);
});

test("company detail loader redirects admin into mod mode", async () => {
    const db = new FakeD1Database([]);
    const request = await buildRequest(
        {
            id: "admin-1",
            email: "admin@example.com",
            role: "admin",
            name: "Admin",
            surname: null,
        },
        "https://example.com/companies/44"
    );

    const response = await companyLoader({
        request,
        context: { cloudflare: { env: { DB: db as unknown as D1Database } } },
        params: { companyId: "44" },
    } as never);

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("Location"), "/home?modCompanyId=44");
});

test("requireBookingAccess rejects cross-company booking ownership", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM bookings b",
            first: [null],
        },
    ]);
    const request = await buildRequest(
        {
            id: "manager-1",
            email: "manager@example.com",
            role: "manager",
            name: "Manager",
            surname: null,
            companyId: 12,
        },
        "https://example.com/bookings/55"
    );

    await assert.rejects(
        () => requireBookingAccess(request, db as unknown as D1Database, 55),
        (error: unknown) =>
            error instanceof Response &&
            error.status === 403 &&
            (error.statusText === "" || typeof error.statusText === "string")
    );
});

test("locations loader rejects manager before touching DB", async () => {
    const db = new FakeD1Database([]);
    const request = await buildRequest(
        {
            id: "manager-2",
            email: "manager@example.com",
            role: "manager",
            name: "Manager",
            surname: null,
            companyId: 12,
        },
        "https://example.com/locations"
    );

    await assert.rejects(
        () => locationsLoader({
            request,
            context: { cloudflare: { env: { DB: db as unknown as D1Database } } },
            params: {},
        } as never),
        (error: unknown) => error instanceof Response && error.status === 403
    );
    assert.equal(db.calls.length, 0);
});

test("locations action rejects manager before touching DB", async () => {
    const db = new FakeD1Database([]);
    const body = new URLSearchParams({ intent: "bulkUpdate", updates: "[]" });
    const request = await buildRequest(
        {
            id: "manager-2",
            email: "manager@example.com",
            role: "manager",
            name: "Manager",
            surname: null,
            companyId: 12,
        },
        "https://example.com/locations",
        {
            method: "POST",
            body,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
    );

    await assert.rejects(
        () => locationsAction({
            request,
            context: { cloudflare: { env: { DB: db as unknown as D1Database } } },
            params: {},
        } as never),
        (error: unknown) => error instanceof Response && error.status === 403
    );
    assert.equal(db.calls.length, 0);
});
