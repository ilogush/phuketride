import test from "node:test";
import assert from "node:assert/strict";
import { loader as assetLoader } from "../app/routes/assets.$";
import { isPrivateAssetPath, isSameOriginMutation } from "../app/lib/request-security.server";
import { checkRateLimit } from "../app/lib/rate-limit.server";
import { serializeSession, type SessionUser } from "../app/lib/auth.server";
import { setRuntimeEnv } from "../app/lib/runtime-env.server";

const adminUser: SessionUser = {
    id: "admin-1",
    email: "admin@example.com",
    role: "admin",
    name: "Admin",
    surname: null,
};

test("isSameOriginMutation accepts matching origin and rejects cross-site origin", () => {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "production");

    const trusted = new Request("https://example.com/login", {
        method: "POST",
        headers: { Origin: "https://example.com" },
    });
    const untrusted = new Request("https://example.com/login", {
        method: "POST",
        headers: { Origin: "https://evil.example" },
    });

    assert.equal(isSameOriginMutation(trusted), true);
    assert.equal(isSameOriginMutation(untrusted), false);
});

test("checkRateLimit fails closed when KV is unavailable", async () => {
    const result = await checkRateLimit(undefined, "ip:test", "login");

    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
});

test("private asset paths require an authenticated session", async () => {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "test");
    assert.equal(isPrivateAssetPath("users/user-1/passport/photo.webp"), true);

    const response = await assetLoader({
        request: new Request("https://example.com/assets/users/user-1/passport/photo.webp"),
        context: {
            cloudflare: {
                env: {
                    ASSETS: {
                        get: async () => null,
                    },
                },
            },
        },
        params: { "*": "users/user-1/passport/photo.webp" },
    } as never);

    assert.equal(response.status, 403);
});

test("private asset paths are accessible with a valid session and keep CORS disabled", async () => {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "test");
    const cookie = await serializeSession(new Request("https://example.com/home"), adminUser);
    const response = await assetLoader({
        request: new Request("https://example.com/assets/users/user-1/passport/photo.webp", {
            headers: { Cookie: cookie },
        }),
        context: {
            cloudflare: {
                env: {
                    ASSETS: {
                        get: async () => ({
                            body: "ok",
                            httpEtag: "etag-1",
                            writeHttpMetadata(headers: Headers) {
                                headers.set("content-type", "image/webp");
                            },
                        }),
                    },
                },
            },
        },
        params: { "*": "users/user-1/passport/photo.webp" },
    } as never);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
});
