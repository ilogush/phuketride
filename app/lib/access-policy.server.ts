import { requireAdmin, requireAuth, type SessionUser } from "~/lib/auth.server";
import { getAdminModCompanyId, getEffectiveCompanyId } from "~/lib/mod-mode.server";
import { validateBookingOwnership, validateContractOwnership, validateCarOwnership } from "~/lib/security.server";

type ScopedDashboardAccess = {
    user: SessionUser;
    companyId: number | null;
    adminModCompanyId: number | null;
    isModMode: boolean;
};

export type CarAccessResult = ScopedDashboardAccess & {
    car: {
        id: number;
        companyId: number;
        licensePlate: string | null;
        brandName: string | null;
        modelName: string | null;
    };
};


function isDashboardRole(role: SessionUser["role"]) {
    return role === "admin" || role === "partner" || role === "manager";
}

/**
 * Unified Access Guard
 * Enforces authentication, role checks, and tenant (companyId) resolution.
 */
async function requireAccess(
    request: Request,
    allowedRoles: SessionUser["role"][],
    options?: { allowAdminGlobal?: boolean }
): Promise<ScopedDashboardAccess> {
    const user = await requireAuth(request);
    
    if (!allowedRoles.includes(user.role)) {
        throw new Response("Forbidden", { status: 403 });
    }

    const adminModCompanyId = getAdminModCompanyId(request, user);
    const companyId = getEffectiveCompanyId(request, user);

    // If company context is missing and user is not an admin with global access allowed
    if (companyId === null && !(options?.allowAdminGlobal && user.role === "admin")) {
        // Partners must have a company context
        if (user.role === "partner" || !options?.allowAdminGlobal) {
            throw new Response("Forbidden (Company Scope Required)", { status: 403 });
        }
    }

    return {
        user,
        companyId,
        adminModCompanyId,
        isModMode: adminModCompanyId !== null,
    };
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
    return requireAccess(request, ["admin", "partner", "manager"], options);
}

export async function requireUserDirectoryAccess(request: Request) {
    return requireAccess(request, ["admin", "partner"]);
}

export async function requireLocationsAccess(request: Request) {
    return requireAccess(request, ["admin", "partner"]);
}

export async function requireAdminUserMutationAccess(request: Request) {
    const access = await requireAccess(request, ["admin"]);
    return {
        ...access,
        companyId: access.user.companyId ?? null, // Root admin might have no companyId
    };
}

export async function requireAdminAnalyticsAccess(request: Request) {
    const access = await requireAccess(request, ["admin", "partner"]);
    return {
        ...access,
        // For partner, always use their actual companyId even if not in mod mode
        companyId: access.user.role === "partner" ? access.user.companyId ?? null : access.companyId,
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

export async function assertContractOwnershipAccess(args: {
    db: D1Database;
    companyId: number | null;
    contractId: number;
}) {
    if (args.companyId === null) {
        return;
    }

    await validateContractOwnership(args.db, args.contractId, args.companyId);
}
export async function requireCarAccess(
    request: Request,
    db: D1Database,
    carId: number
): Promise<CarAccessResult> {
    const access = await requireScopedDashboardAccess(request, { allowAdminGlobal: true });
    
    const car = await db
        .prepare(`
            SELECT
                cc.id,
                cc.company_id AS companyId,
                cc.license_plate AS licensePlate,
                cb.name AS brandName,
                cm.name AS modelName
            FROM company_cars cc
            LEFT JOIN car_templates ct ON ct.id = cc.template_id
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            WHERE cc.id = ?
            LIMIT 1
            `
        )
        .bind(carId)
        .first<{ id: number; companyId: number; licensePlate: string | null; brandName: string | null; modelName: string | null }>();

    if (!car) {
        throw new Response("Car not found", { status: 404 });
    }

    if (access.companyId !== null && car.companyId !== access.companyId) {
        throw new Response("Access denied", { status: 403 });
    }

    return { ...access, car };
}

export async function requireAuthAccess(request: Request) {
    const user = await requireAuth(request);
    return {
        user,
        companyId: null,
        isModMode: false,
        adminModCompanyId: null,
    };
}

export async function requirePublicAccess(request: Request) {
    return {
        user: null,
        companyId: null,
        isModMode: false,
        adminModCompanyId: null,
    };
}
