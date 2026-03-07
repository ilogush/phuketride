import test from "node:test";
import assert from "node:assert/strict";
import { loadDashboardHomePageData } from "../app/lib/dashboard-home.server";
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

test("loadDashboardHomePageData uses scoped admin mod company access", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM companies WHERE id = ? LIMIT 1",
            first: [{ bankName: "Bangkok Bank", accountNumber: "123", accountName: "Phuket Ride" }],
        },
        {
            match: "AS managersCount",
            first: [{
                managersCount: 4,
                carsCount: 12,
                inWorkshopCount: 2,
                totalContracts: 20,
                monthContracts: 5,
                monthRevenue: 150000,
            }],
        },
        {
            match: "FROM calendar_events",
            all: [{ results: [{ id: 11, title: "Task", description: "Review", status: "pending" }] }],
        },
    ]);

    const result = await loadDashboardHomePageData({
        request: await buildRequest(
            {
                id: "admin-1",
                email: "admin@example.com",
                role: "admin",
                name: "Admin",
                surname: null,
            },
            "https://example.com/home?modCompanyId=77"
        ),
        db: db as unknown as D1Database,
    });

    assert.equal(result.user.id, "admin-1");
    assert.equal(result.statCards.length, 4);
    assert.equal(result.tasks.length, 1);
    assert.deepEqual(db.calls[0]?.bindings, [77]);
});

test("loadDashboardHomePageData returns empty dashboard payload on metrics failure", async () => {
    const db = new FakeD1Database([]);

    const result = await loadDashboardHomePageData({
        request: await buildRequest({
            id: "partner-1",
            email: "partner@example.com",
            role: "partner",
            name: "Partner",
            surname: null,
            companyId: 12,
        }),
        db: db as unknown as D1Database,
    });

    assert.equal(result.user.id, "partner-1");
    assert.deepEqual(result.statCards, []);
    assert.deepEqual(result.tasks, []);
});
