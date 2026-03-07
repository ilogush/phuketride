import { test } from "node:test";
import assert from "node:assert/strict";
import { getAdminModCompanyId, getEffectiveCompanyId, withModCompanyId, getRequestModCompanyId } from "../app/lib/mod-mode.server";
import type { SessionUser } from "../app/lib/auth.server";

test("getAdminModCompanyId returns null for non-admin user", () => {
    const user: SessionUser = {
        id: "user-1",
        email: "partner@example.com",
        role: "partner",
        companyId: 10,
        name: null,
        surname: null,
    };

    const request = new Request("https://example.com/dashboard?modCompanyId=99");
    const result = getAdminModCompanyId(request, user);

    assert.equal(result, null);
});

test("getAdminModCompanyId extracts valid modCompanyId for admin", () => {
    const user: SessionUser = {
        id: "admin-1",
        email: "admin@example.com",
        role: "admin",
        companyId: null,
        name: null,
        surname: null,
    };

    const request = new Request("https://example.com/dashboard?modCompanyId=42");
    const result = getAdminModCompanyId(request, user);

    assert.equal(result, 42);
});

test("getAdminModCompanyId returns null for invalid modCompanyId", () => {
    const user: SessionUser = {
        id: "admin-1",
        email: "admin@example.com",
        role: "admin",
        companyId: null,
        name: null,
        surname: null,
    };

    const request = new Request("https://example.com/dashboard?modCompanyId=invalid");
    const result = getAdminModCompanyId(request, user);

    assert.equal(result, null);
});

test("getEffectiveCompanyId returns modCompanyId when admin is in mod mode", () => {
    const user: SessionUser = {
        id: "admin-1",
        email: "admin@example.com",
        role: "admin",
        companyId: null,
        name: null,
        surname: null,
    };

    const request = new Request("https://example.com/dashboard?modCompanyId=77");
    const result = getEffectiveCompanyId(request, user);

    assert.equal(result, 77);
});

test("getEffectiveCompanyId returns user companyId when not in mod mode", () => {
    const user: SessionUser = {
        id: "partner-1",
        email: "partner@example.com",
        role: "partner",
        companyId: 15,
        name: null,
        surname: null,
    };

    const request = new Request("https://example.com/dashboard");
    const result = getEffectiveCompanyId(request, user);

    assert.equal(result, 15);
});

test("withModCompanyId appends modCompanyId to path without query", () => {
    const result = withModCompanyId("/contracts", 42);
    assert.equal(result, "/contracts?modCompanyId=42");
});

test("withModCompanyId appends modCompanyId to path with existing query", () => {
    const result = withModCompanyId("/contracts?status=active", 42);
    assert.equal(result, "/contracts?status=active&modCompanyId=42");
});

test("withModCompanyId returns path unchanged when modCompanyId is null", () => {
    const result = withModCompanyId("/contracts?status=active", null);
    assert.equal(result, "/contracts?status=active");
});

test("getRequestModCompanyId returns validated modCompanyId for admin", () => {
    const user: SessionUser = {
        id: "admin-1",
        email: "admin@example.com",
        role: "admin",
        companyId: null,
        name: null,
        surname: null,
    };

    const request = new Request("https://example.com/dashboard?modCompanyId=88");
    const result = getRequestModCompanyId(request, user);

    assert.equal(result, 88);
});

test("getRequestModCompanyId returns null for non-admin", () => {
    const user: SessionUser = {
        id: "partner-1",
        email: "partner@example.com",
        role: "partner",
        companyId: 20,
        name: null,
        surname: null,
    };

    const request = new Request("https://example.com/dashboard?modCompanyId=88");
    const result = getRequestModCompanyId(request, user);

    assert.equal(result, null);
});
