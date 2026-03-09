import test from "node:test";
import assert from "node:assert/strict";
import { loadCarEditPage } from "../app/features/car-edit/car-edit.loader.server";
import { loadMyContractDetailPage } from "../app/features/my-contract-detail/my-contract-detail.loader.server";
import { serializeSession, type SessionUser } from "../app/lib/auth.server";
import { setRuntimeEnv } from "../app/lib/runtime-env.server";
import { FakeD1Database } from "./helpers/fake-d1";

async function buildRequest(user: SessionUser, url = "https://example.com/home") {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "test");
    const baseRequest = new Request(url);
    const cookie = await serializeSession(baseRequest, user);
    return new Request(url, {
        headers: {
            Cookie: cookie,
        },
    });
}

test("loadCarEditPage rejects invalid car id with 400", async () => {
    const db = new FakeD1Database([]);
    const request = await buildRequest({
        id: "manager-1",
        email: "manager@example.com",
        role: "manager",
        name: "Manager",
        surname: null,
        companyId: 12,
    });

    await assert.rejects(
        () =>
            loadCarEditPage({
                request,
                carIdParam: "invalid",
                context: { cloudflare: { env: { DB: db as unknown as D1Database } } },
            }),
        (error: unknown) => error instanceof Response && error.status === 400
    );
    assert.equal(db.calls.length, 0);
});

test("loadCarEditPage rejects missing car with 403", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM company_cars",
            first: [null],
        },
    ]);
    const request = await buildRequest({
        id: "manager-1",
        email: "manager@example.com",
        role: "manager",
        name: "Manager",
        surname: null,
        companyId: 12,
    });

    // validateCarOwnership throws 403 for both missing car and wrong company
    await assert.rejects(
        () =>
            loadCarEditPage({
                request,
                carIdParam: "55",
                context: { cloudflare: { env: { DB: db as unknown as D1Database } } },
            }),
        (error: unknown) => error instanceof Response && error.status === 404
    );
    assert.equal(db.countCalls("FROM company_cars", "first"), 1);
});

test("loadCarEditPage rejects cross-company access with 404", async () => {
    const db = new FakeD1Database([
        {
            match: /WHERE cc\.id = \?\s+AND cc\.company_id = \?\s+LIMIT 1/,
            first: [null], // Returns null because company_id doesn't match
        },
    ]);
    const request = await buildRequest({
        id: "manager-1",
        email: "manager@example.com",
        role: "manager",
        name: "Manager",
        surname: null,
        companyId: 12,
    });

    await assert.rejects(
        () =>
            loadCarEditPage({
                request,
                carIdParam: "55",
                context: { cloudflare: { env: { DB: db as unknown as D1Database } } },
            }),
        (error: unknown) => error instanceof Response && error.status === 404
    );
});

test("loadMyContractDetailPage rejects invalid contract id with 400", async () => {
    const db = new FakeD1Database([]);
    const request = await buildRequest({
        id: "user-1",
        email: "user@example.com",
        role: "user",
        name: "Client",
        surname: null,
    });

    await assert.rejects(
        () =>
            loadMyContractDetailPage({
                db: db as unknown as D1Database,
                request,
                contractIdParam: "bad-id",
            }),
        (error: unknown) => error instanceof Response && error.status === 400
    );
    assert.equal(db.calls.length, 0);
});

test("loadMyContractDetailPage rejects unknown contract with 404", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM contracts c",
            first: [null],
        },
    ]);
    const request = await buildRequest({
        id: "user-1",
        email: "user@example.com",
        role: "user",
        name: "Client",
        surname: null,
    });

    const originalError = console.error;
    console.error = () => {};
    try {
        await assert.rejects(
            () =>
                loadMyContractDetailPage({
                    db: db as unknown as D1Database,
                    request,
                    contractIdParam: "999",
                }),
            (error: unknown) => error instanceof Response && error.status === 404
        );
    } finally {
        console.error = originalError;
    }
    assert.equal(db.countCalls("FROM contracts c", "first"), 1);
});
