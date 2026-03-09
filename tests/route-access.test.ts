import test from "node:test";
import assert from "node:assert/strict";
import { loader as logsLoader, action as logsAction } from "../app/routes/logs";
import { loader as companyLoader } from "../app/routes/companies.$companyId";
import { loader as locationsLoader, action as locationsAction } from "../app/routes/locations";
import { loader as editUserLoader } from "../app/routes/users.$userId.edit";
import { loader as createUserLoader } from "../app/routes/users.create";
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

test("logs loader allows partner analytics access scoped to their company", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM audit_logs a",
            all: [{ results: [] }],
        },
        {
            match: "SELECT count(*) AS count FROM audit_logs",
            first: [{ count: 0 }],
        },
    ]);
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

    const response = await logsLoader({
        request,
        context: { cloudflare: { env: { DB: db as unknown as D1Database } } },
        params: {},
    } as never);

    assert.deepEqual((response as { logs: unknown[] }).logs, []);
    assert.equal(db.countCalls("FROM audit_logs a", "all"), 1);
});

test("logs action rejects partner before touching audit log storage", async () => {
    const db = new FakeD1Database([
        {
            match: "DELETE FROM audit_logs WHERE company_id = ?",
            run: [{ meta: { changes: 1 } }],
        },
    ]);
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

    assert.equal(db.countCalls("DELETE FROM audit_logs WHERE company_id = ?", "run"), 0);
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

test("user edit loader allows partner to access a manager in their company", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM users u\n                LEFT JOIN managers m ON u.id = m.user_id",
            first: [
                {
                    id: "manager-001",
                    email: "manager@example.com",
                    role: "manager",
                    name: "Manager",
                    surname: null,
                    phone: null,
                    whatsapp: null,
                    telegram: null,
                    passportNumber: null,
                    passportPhotos: null,
                    driverLicensePhotos: null,
                    avatarUrl: null,
                    hotelId: null,
                    roomNumber: null,
                    locationId: null,
                    districtId: null,
                    address: null,
                },
            ],
        },
        {
            match: "FROM hotels",
            all: [{ results: [] }],
        },
        {
            match: "FROM locations",
            all: [{ results: [] }],
        },
        {
            match: "FROM districts",
            all: [{ results: [] }],
        },
    ]);
    const request = await buildRequest(
        {
            id: "partner-1",
            email: "partner@example.com",
            role: "partner",
            name: "Partner",
            surname: null,
            companyId: 12,
        },
        "https://example.com/users/manager-001/edit"
    );

    const result = await editUserLoader({
        request,
        context: { cloudflare: { env: { DB: db as unknown as D1Database } } },
        params: { userId: "manager-001" },
    } as never);

    assert.equal((result as { user: { id: string } }).user.id, "manager-001");
});

test("user edit loader rejects manager before touching DB", async () => {
    const db = new FakeD1Database([]);
    const request = await buildRequest(
        {
            id: "manager-9",
            email: "manager@example.com",
            role: "manager",
            name: "Manager",
            surname: null,
            companyId: 12,
        },
        "https://example.com/users/manager-001/edit"
    );

    await assert.rejects(
        () => editUserLoader({
            request,
            context: { cloudflare: { env: { DB: db as unknown as D1Database } } },
            params: { userId: "manager-001" },
        } as never),
        (error: unknown) => error instanceof Response && error.status === 403
    );
    assert.equal(db.calls.length, 0);
});

test("user create loader allows partner with company scope", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM hotels",
            all: [{ results: [] }],
        },
        {
            match: "FROM locations",
            all: [{ results: [] }],
        },
        {
            match: "FROM districts",
            all: [{ results: [] }],
        },
    ]);
    const request = await buildRequest(
        {
            id: "partner-2",
            email: "partner@example.com",
            role: "partner",
            name: "Partner",
            surname: null,
            companyId: 15,
        },
        "https://example.com/users/create"
    );

    const result = await createUserLoader({
        request,
        context: { cloudflare: { env: { DB: db as unknown as D1Database, RATE_LIMIT: undefined } } },
        params: {},
    } as never);

    assert.deepEqual((result as { hotels: unknown[] }).hotels, []);
});
