import { requireAdmin, requireAuth, type SessionUser } from "~/lib/auth.server";
import { getAdminModCompanyId, getEffectiveCompanyId } from "~/lib/mod-mode.server";
import { validateBookingOwnership, validateContractOwnership } from "~/lib/security.server";

type ScopedDashboardAccess = {
    user: SessionUser;
    companyId: number | null;
    adminModCompanyId: number | null;
    isModMode: boolean;
};

function isDashboardRole(role: SessionUser["role"]) {
    return role === "admin" || role === "partner" || role === "manager";
}

export async function requireDashboardUser(request: Request): Promise<SessionUser> {
    const user = await requireAuth(request);
    if (!isDashboardRole(user.role)) {
        throw new Response("Forbidden", { status: 403 });
    }
    return user;
}

export async function requireScopedDashboardAccess(
    request: Request,
    options?: { allowAdminGlobal?: boolean }
): Promise<ScopedDashboardAccess> {
    const user = await requireDashboardUser(request);
    const adminModCompanyId = getAdminModCompanyId(request, user);
    const companyId = getEffectiveCompanyId(request, user);

    if (companyId === null && !(options?.allowAdminGlobal && user.role === "admin")) {
        throw new Response("Forbidden", { status: 403 });
    }

    return {
        user,
        companyId,
        adminModCompanyId,
        isModMode: adminModCompanyId !== null,
    };
}

export async function requireUserDirectoryAccess(request: Request) {
    const user = await requireAuth(request);
    if (!["admin", "partner"].includes(user.role)) {
        throw new Response("Forbidden", { status: 403 });
    }

    const adminModCompanyId = getAdminModCompanyId(request, user);
    const companyId = getEffectiveCompanyId(request, user);
    if (user.role === "partner" && companyId === null) {
        throw new Response("Forbidden", { status: 403 });
    }

    return {
        user,
        companyId,
        adminModCompanyId,
        isModMode: adminModCompanyId !== null,
    };
}

export async function requireAdminUserMutationAccess(request: Request) {
    const user = await requireAdmin(request);
    const adminModCompanyId = getAdminModCompanyId(request, user);

    return {
        user,
        companyId: user.companyId ?? null,
        adminModCompanyId,
        isModMode: adminModCompanyId !== null,
    };
}

export async function requireAdminAnalyticsAccess(request: Request) {
    const user = await requireAdmin(request);

    return {
        user,
        companyId: null,
        adminModCompanyId: null,
        isModMode: false,
    };
}

export async function requireSelfProfileAccess(request: Request) {
    const user = await requireAuth(request);

    return {
        user,
        companyId: user.companyId ?? null,
    };
}

export async function requireBookingAccess(
    request: Request,
    db: D1Database,
    bookingId: number
) {
    const access = await requireScopedDashboardAccess(request, { allowAdminGlobal: true });
    if (access.companyId !== null) {
        await validateBookingOwnership(db, bookingId, access.companyId);
    }
    return access;
}

export async function requireContractAccess(
    request: Request,
    db: D1Database,
    contractId: number
) {
    const access = await requireScopedDashboardAccess(request, { allowAdminGlobal: true });
    if (access.companyId !== null) {
        await validateContractOwnership(db, contractId, access.companyId);
    }
    return access;
}
