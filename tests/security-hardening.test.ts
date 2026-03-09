import test from "node:test";
import assert from "node:assert/strict";
import { loader as assetLoader } from "../app/routes/assets.$";
import { action as publicCheckoutAction } from "../app/routes/cars.$id.checkout";
import { action as createCarTemplateAction } from "../app/routes/car-templates.create";
import { action as searchEventsAction } from "../app/routes/api.search-events";
import { action as myContractDetailAction } from "../app/routes/my-contracts.$id";
import { loader as bookingConfirmationDetailLoader } from "../app/routes/booking-confirmation.$id";
import { loadBookingConfirmationPage } from "../app/features/booking-confirmation/booking-confirmation.loader.server";
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

const plainUser: SessionUser = {
    id: "user-2",
    email: "user2@example.com",
    role: "user",
    name: "User",
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

test("private asset paths are accessible for admin sessions and keep CORS disabled", async () => {
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

test("private asset paths reject authenticated users without ownership", async () => {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "test");
    const cookie = await serializeSession(new Request("https://example.com/home"), plainUser);
    const response = await assetLoader({
        request: new Request("https://example.com/assets/users/user-1/passport/photo.webp", {
            headers: { Cookie: cookie },
        }),
        context: {
            cloudflare: {
                env: {
                    DB: {
                        prepare() {
                            throw new Error("DB must not be queried when requester has no company scope");
                        },
                    },
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

    assert.equal(response.status, 403);
});

test("private asset paths remain accessible to the document owner", async () => {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "test");
    const cookie = await serializeSession(
        new Request("https://example.com/home"),
        { ...plainUser, id: "user-1" },
    );
    const response = await assetLoader({
        request: new Request("https://example.com/assets/users/user-1/passport/photo.webp", {
            headers: { Cookie: cookie },
        }),
        context: {
            cloudflare: {
                env: {
                    DB: {
                        prepare() {
                            throw new Error("DB must not be queried for self-access");
                        },
                    },
                    ASSETS: {
                        get: async () => ({
                            body: "ok",
                            httpEtag: "etag-2",
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
});

test("public booking confirmation never loads contract data without an authenticated flow token", async () => {
    const result = await loadBookingConfirmationPage({
        db: {
            prepare() {
                throw new Error("booking confirmation page must not query contracts");
            },
        } as unknown as D1Database,
        request: new Request("https://example.com/booking-confirmation?status=ok"),
    });

    assert.equal(result.status, "ok");
    assert.equal(result.bookingSummary, null);
});

test("booking confirmation detail route redirects to the safe generic page", async () => {
    await assert.rejects(
        () =>
            bookingConfirmationDetailLoader({
                request: new Request("https://example.com/booking-confirmation/123"),
                context: {
                    cloudflare: {
                        env: {
                            DB: {},
                        },
                    },
                },
                params: { id: "123" },
            } as never),
        (error: unknown) =>
            error instanceof Response &&
            error.status === 302 &&
            error.headers.get("Location") === "/booking-confirmation",
    );
});

test("public checkout is rate limited before any database work", async () => {
    const response = await publicCheckoutAction({
        request: new Request("https://example.com/cars/test-car/checkout", {
            method: "POST",
            headers: {
                "User-Agent": "rate-limit-test",
            },
        }),
        context: {
            cloudflare: {
                env: {
                    RATE_LIMIT: {
                        get: async () => ({ count: 10, resetAt: Date.now() + 60_000 }),
                        put: async () => undefined,
                    },
                    DB: {
                        prepare() {
                            throw new Error("DB must not be touched when checkout is rate limited");
                        },
                    },
                },
            },
        },
        params: { id: "test-car" },
    } as never);

    assert.equal(response.status, 302);
    assert.match(
        response.headers.get("Location") ?? "",
        /^\/booking-confirmation\?status=error&message=/,
    );
});

test("admin route actions without telemetry still reject cross-site POST", async () => {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "production");
    const cookie = await serializeSession(new Request("https://example.com/home"), adminUser);

    await assert.rejects(
        () =>
            createCarTemplateAction({
                request: new Request("https://example.com/car-templates/create", {
                    method: "POST",
                    headers: {
                        Cookie: cookie,
                        Origin: "https://evil.example",
                    },
                    body: new URLSearchParams(),
                }),
                context: {
                    cloudflare: {
                        env: {
                            DB: {
                                prepare() {
                                    throw new Error("DB must not be touched for cross-site admin POST");
                                },
                            },
                        },
                    },
                },
                params: {},
            } as never),
        (error: unknown) => error instanceof Response && error.status === 403,
    );
});

test("authenticated user route wrappers reject cross-site POST before loading scoped data", async () => {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "production");
    const cookie = await serializeSession(new Request("https://example.com/home"), {
        id: "user-9",
        email: "user9@example.com",
        role: "user",
        name: "User",
        surname: null,
    });

    await assert.rejects(
        () =>
            myContractDetailAction({
                request: new Request("https://example.com/my-contracts/123", {
                    method: "POST",
                    headers: {
                        Cookie: cookie,
                        Origin: "https://evil.example",
                    },
                    body: new URLSearchParams({ review: "bad", rating: "1" }),
                }),
                context: {
                    cloudflare: {
                        env: {
                            DB: {
                                prepare() {
                                    throw new Error("DB must not be touched for cross-site user POST");
                                },
                            },
                        },
                    },
                },
                params: { id: "123" },
            } as never),
        (error: unknown) => error instanceof Response && error.status === 403,
    );
});

test("search events API rejects cross-site POST before logging telemetry data", async () => {
    setRuntimeEnv({ SESSION_SECRET: "test-session-secret" } as Env, "production");

    await assert.rejects(
        () =>
            searchEventsAction({
                request: new Request("https://example.com/api/search-events", {
                    method: "POST",
                    headers: {
                        Origin: "https://evil.example",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        district: "Patong",
                        query: "SUV",
                        source: "hero-search",
                    }),
                }),
                context: {
                    cloudflare: {
                        env: {
                            RATE_LIMIT: {
                                get: async () => null,
                                put: async () => undefined,
                            },
                            DB: {
                                prepare() {
                                    throw new Error("DB must not be touched for cross-site search telemetry");
                                },
                            },
                        },
                    },
                },
                params: {},
            } as never),
        (error: unknown) => error instanceof Response && error.status === 403,
    );
});
