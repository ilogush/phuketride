import test from "node:test";
import assert from "node:assert/strict";
import { loadAppLayoutData } from "../app/lib/app-layout.server";
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

test("loadAppLayoutData merges latest user snapshot and personal notification count", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM users",
            first: [{
                avatarUrl: "/assets/avatars/user-1.webp",
                name: "Updated",
                surname: "Customer",
            }],
        },
        {
            match: "SUM(CASE WHEN status = 'active'",
            first: [{ upcomingCount: 2, recentCount: 3 }],
        },
    ]);

    const result = await loadAppLayoutData({
        request: await buildRequest({
            id: "user-1",
            email: "user@example.com",
            role: "user",
            name: "Legacy",
            surname: null,
            avatarUrl: null,
        }),
        db: db as unknown as D1Database,
    });

    assert.equal(result.user.name, "Updated");
    assert.equal(result.user.surname, "Customer");
    assert.equal(result.user.avatarUrl, "/assets/avatars/user-1.webp");
    assert.equal(result.notificationsCount, 5);
    assert.equal(db.countCalls("FROM users", "first"), 1);
    assert.equal(db.countCalls("SUM(CASE WHEN status = 'active'", "first"), 1);
});

test("loadAppLayoutData skips personal notifications for dashboard roles", async () => {
    const db = new FakeD1Database([
        {
            match: "FROM users",
            first: [{
                avatarUrl: null,
                name: "Partner",
                surname: "Owner",
            }],
        },
    ]);

    const result = await loadAppLayoutData({
        request: await buildRequest({
            id: "partner-1",
            email: "partner@example.com",
            role: "partner",
            name: "Partner",
            surname: null,
            companyId: 11,
        }),
        db: db as unknown as D1Database,
    });

    assert.equal(result.notificationsCount, 0);
    assert.equal(db.countCalls("SUM(CASE WHEN status = 'active'", "first"), 0);
});

test("loadAppLayoutData falls back to session user and zero notifications on db errors", async () => {
    const db = new FakeD1Database([]);

    const result = await loadAppLayoutData({
        request: await buildRequest({
            id: "user-2",
            email: "user2@example.com",
            role: "user",
            name: "Session Name",
            surname: "Session Surname",
            avatarUrl: "/assets/avatars/session.webp",
        }),
        db: db as unknown as D1Database,
    });

    assert.equal(result.user.name, "Session Name");
    assert.equal(result.user.surname, "Session Surname");
    assert.equal(result.user.avatarUrl, "/assets/avatars/session.webp");
    assert.equal(result.notificationsCount, 0);
});
