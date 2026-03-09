import test from "node:test";
import assert from "node:assert/strict";
import {
    requireAdminUserMutationAccess,
    requireAdminAnalyticsAccess,
    requireLocationsAccess,
    requireScopedDashboardAccess,
    requireSelfProfileAccess,
    requireUserDirectoryAccess,
} from "../app/lib/access-policy.server";
import { serializeSession, type SessionUser } from "../app/lib/auth.server";
import { setRuntimeEnv } from "../app/lib/runtime-env.server";

async function buildRequest(user: SessionUser, url = "https://example.com/dashboard") {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "test");
    const baseRequest = new Request(url);
    const cookie = await serializeSession(baseRequest, user);
    return new Request(url, {
        headers: {
            Cookie: cookie,
        },
    });
}

test("requireScopedDashboardAccess resolves admin mod mode company scope", async () => {
    const request = await buildRequest(
        {
            id: "admin-1",
            email: "admin@example.com",
            role: "admin",
            name: "Admin",
            surname: null,
        },
        "https://example.com/contracts?modCompanyId=77"
    );

    const access = await requireScopedDashboardAccess(request, { allowAdminGlobal: true });
    assert.equal(access.companyId, 77);
    assert.equal(access.isModMode, true);
    assert.equal(access.adminModCompanyId, 77);
});

test("requireScopedDashboardAccess rejects plain user role", async () => {
    const request = await buildRequest({
        id: "user-1",
        email: "user@example.com",
        role: "user",
        name: "Client",
        surname: null,
        companyId: 10,
    });

    await assert.rejects(
        () => requireScopedDashboardAccess(request),
        (error: unknown) => error instanceof Response && error.status === 403
    );
});

test("requireUserDirectoryAccess keeps partner company scope", async () => {
    const request = await buildRequest({
        id: "partner-1",
        email: "partner@example.com",
        role: "partner",
        name: "Partner",
        surname: null,
        companyId: 15,
    });

    const access = await requireUserDirectoryAccess(request);
    assert.equal(access.companyId, 15);
    assert.equal(access.isModMode, false);
});

test("requireUserDirectoryAccess allows global admin without company scope", async () => {
    const request = await buildRequest({
        id: "admin-4",
        email: "admin@example.com",
        role: "admin",
        name: "Admin",
        surname: null,
    });

    const access = await requireUserDirectoryAccess(request);
    assert.equal(access.companyId, null);
    assert.equal(access.isModMode, false);
});

test("requireAdminUserMutationAccess keeps admin mod mode scope", async () => {
    const request = await buildRequest(
        {
            id: "admin-2",
            email: "admin@example.com",
            role: "admin",
            name: "Admin",
            surname: null,
        },
        "https://example.com/users/create?modCompanyId=18"
    );

    const access = await requireAdminUserMutationAccess(request);
    assert.equal(access.companyId, 18);
    assert.equal(access.adminModCompanyId, 18);
    assert.equal(access.isModMode, true);
});

test("requireAdminUserMutationAccess allows global admin without company scope", async () => {
    const request = await buildRequest({
        id: "admin-6",
        email: "admin@example.com",
        role: "admin",
        name: "Admin",
        surname: null,
    });

    const access = await requireAdminUserMutationAccess(request);
    assert.equal(access.companyId, null);
    assert.equal(access.isModMode, false);
});

test("requireAdminAnalyticsAccess allows global admin without company scope", async () => {
    const request = await buildRequest({
        id: "admin-7",
        email: "admin@example.com",
        role: "admin",
        name: "Admin",
        surname: null,
    });

    const access = await requireAdminAnalyticsAccess(request);
    assert.equal(access.companyId, null);
    assert.equal(access.isModMode, false);
});

test("requireSelfProfileAccess keeps authenticated user context", async () => {
    const request = await buildRequest({
        id: "user-2",
        email: "user@example.com",
        role: "user",
        name: "Client",
        surname: null,
        companyId: 9,
    });

    const access = await requireSelfProfileAccess(request);
    assert.equal(access.user.id, "user-2");
    assert.equal(access.companyId, 9);
});

test("requireLocationsAccess keeps admin mod mode scope", async () => {
    const request = await buildRequest(
        {
            id: "admin-3",
            email: "admin@example.com",
            role: "admin",
            name: "Admin",
            surname: null,
        },
        "https://example.com/locations?modCompanyId=21"
    );

    const access = await requireLocationsAccess(request);
    assert.equal(access.companyId, 21);
    assert.equal(access.isModMode, true);
});

test("requireLocationsAccess allows global admin without company scope", async () => {
    const request = await buildRequest({
        id: "admin-5",
        email: "admin@example.com",
        role: "admin",
        name: "Admin",
        surname: null,
    });

    const access = await requireLocationsAccess(request);
    assert.equal(access.companyId, null);
    assert.equal(access.isModMode, false);
});
