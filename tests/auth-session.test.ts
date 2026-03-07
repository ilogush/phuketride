import test from "node:test";
import assert from "node:assert/strict";
import {
    getUserFromSession,
    logout,
    serializeSession,
    type SessionUser,
} from "../app/lib/auth.server";
import { setRuntimeEnv } from "../app/lib/runtime-env.server";

const sessionUser: SessionUser = {
    id: "user-1",
    email: "user@example.com",
    role: "user",
    name: "Test",
    surname: "User",
    companyId: 11,
};

function setupRuntime() {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "test");
}

test("serializeSession sets Secure for https requests", async () => {
    setupRuntime();
    const cookie = await serializeSession(new Request("https://example.com/home"), sessionUser);

    assert.match(cookie, /;\s*Secure/i);
    assert.match(cookie, /;\s*HttpOnly/i);
    assert.match(cookie, /;\s*SameSite=Lax/i);
});

test("serializeSession omits Secure for http requests", async () => {
    setupRuntime();
    const cookie = await serializeSession(new Request("http://example.com/home"), sessionUser);

    assert.doesNotMatch(cookie, /;\s*Secure/i);
    assert.match(cookie, /;\s*HttpOnly/i);
});

test("getUserFromSession restores serialized session payload", async () => {
    setupRuntime();
    const cookie = await serializeSession(new Request("https://example.com/home"), sessionUser);
    const request = new Request("https://example.com/home", {
        headers: { Cookie: cookie },
    });

    const parsed = await getUserFromSession(request);
    assert.ok(parsed);
    assert.equal(parsed.id, sessionUser.id);
    assert.equal(parsed.email, sessionUser.email);
    assert.equal(parsed.companyId, sessionUser.companyId);
});

test("logout returns clearing cookie contract", async () => {
    setupRuntime();
    const cookie = await logout(new Request("https://example.com/logout"));

    assert.match(cookie, /Max-Age=0/i);
    assert.match(cookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i);
    assert.match(cookie, /;\s*Secure/i);
});
