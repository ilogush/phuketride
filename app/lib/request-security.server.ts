import { getRuntimeMode } from "~/lib/runtime-env.server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getRequestOrigin(value: string | null): string | null {
    if (!value) return null;

    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
}

export function isSameOriginMutation(request: Request): boolean {
    const method = request.method.toUpperCase();
    if (SAFE_METHODS.has(method)) {
        return true;
    }

    const targetOrigin = new URL(request.url).origin;
    const origin = getRequestOrigin(request.headers.get("Origin"));
    if (origin) {
        return origin === targetOrigin;
    }

    const refererOrigin = getRequestOrigin(request.headers.get("Referer"));
    if (refererOrigin) {
        return refererOrigin === targetOrigin;
    }

    return getRuntimeMode() === "test";
}

export function assertSameOriginMutation(request: Request) {
    if (!isSameOriginMutation(request)) {
        throw new Response("Forbidden", { status: 403 });
    }
}

const PRIVATE_ASSET_PATTERNS = [
    /^users\/[^/]+\/passport\//,
    /^users\/[^/]+\/driver-license\//,
] as const;

export function isPrivateAssetPath(path: string): boolean {
    return PRIVATE_ASSET_PATTERNS.some((pattern) => pattern.test(path));
}
