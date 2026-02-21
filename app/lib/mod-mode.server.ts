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
