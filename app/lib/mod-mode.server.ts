import type { SessionUser } from "~/lib/auth.server";

export function getAdminModCompanyId(request: Request, user: SessionUser): number | null {
    if (user.role !== "admin") {
        return null;
    }

    const url = new URL(request.url);
    const raw = url.searchParams.get("modCompanyId");
    if (!raw) {
        return null;
    }

    const companyId = Number.parseInt(raw, 10);
    if (!Number.isFinite(companyId) || companyId <= 0) {
        return null;
    }

    return companyId;
}

export function getEffectiveCompanyId(request: Request, user: SessionUser): number | null {
    const adminModCompanyId = getAdminModCompanyId(request, user);
    if (adminModCompanyId !== null) {
        return adminModCompanyId;
    }

    return user.companyId ?? null;
}
/**
 * Centralized helper to build URL with modCompanyId preserved
 * Use this instead of ad hoc query param handling
 */
export function withModCompanyId(path: string, modCompanyId: number | null): string {
    if (modCompanyId === null) {
        return path;
    }

    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}modCompanyId=${modCompanyId}`;
}

/**
 * Extract modCompanyId from request for URL building
 * Returns validated number or null
 */
export function getRequestModCompanyId(request: Request, user: SessionUser): number | null {
    return getAdminModCompanyId(request, user);
}
