import { createCookie, redirect } from "react-router";
import { verifyPasswordHash } from "~/lib/password.server";
import { getRuntimeEnv, getRuntimeMode } from "~/lib/runtime-env.server";

const FALLBACK_DEV_SESSION_SECRET = "dev-session-secret-change-me";
const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionCookieSerializeOptions = {
    secure: boolean;
    maxAge?: number;
};

function getSessionSecrets() {
    const env = getRuntimeEnv();
    const configured = env?.SESSION_SECRET?.trim();
    if (configured) {
        return [configured];
    }

    if (getRuntimeMode() === "production") {
        throw new Error("SESSION_SECRET is required in production");
    }

    console.warn(
        "[auth] ⚠️  SESSION_SECRET is not set — using insecure fallback. " +
        "Set SESSION_SECRET in your .dev.vars or environment before deploying."
    );
    return [FALLBACK_DEV_SESSION_SECRET];
}

function getSessionCookie() {
    return createCookie("session", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: DEFAULT_SESSION_MAX_AGE_SECONDS,
        path: "/",
        secrets: getSessionSecrets(),
    });
}

function isSecureRequest(request: Request): boolean {
    return request.url.startsWith("https://");
}

function getSessionCookieSerializeOptions(
    request: Request,
    options?: { maxAge?: number }
): SessionCookieSerializeOptions {
    return {
        secure: isSecureRequest(request),
        ...(options?.maxAge !== undefined ? { maxAge: options.maxAge } : {}),
    };
}

function getSessionCookieClearOptions(request: Request): SessionCookieSerializeOptions & { expires: Date } {
    return {
        secure: isSecureRequest(request),
        maxAge: 0,
        // Explicit epoch expiration avoids client differences around max-age handling.
        expires: new Date(0),
    };
}

export async function serializeSession(
    request: Request,
    data: SessionUser | null,
    options?: { maxAge?: number }
) {
    return getSessionCookie().serialize(data, getSessionCookieSerializeOptions(request, options));
}

export type UserRole = "admin" | "partner" | "manager" | "user";

export interface SessionUser {
    id: string;
    email: string;
    role: UserRole;
    name: string | null;
    surname: string | null;
    avatarUrl?: string | null;
    companyId?: number;
}

interface LoginUser {
    id: string;
    email: string;
    role: string;
    name: string | null;
    surname: string | null;
    phone: string | null;
    whatsapp: string | null;
    telegram: string | null;
    passportNumber: string | null;
    passportPhotos: string | null;
    driverLicensePhotos: string | null;
    passwordHash: string | null;
    avatarUrl: string | null;
    hotelId: number | null;
    roomNumber: string | null;
    locationId: number | null;
    districtId: number | null;
    address: string | null;
    isFirstLogin: number | null;
    archivedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

// Get user from session
export async function getUserFromSession(
    request: Request
): Promise<SessionUser | null> {
    try {
        const cookieHeader = request.headers.get("Cookie");
        const session = await getSessionCookie().parse(cookieHeader);

        if (!session?.id) {
            return null;
        }

        return session as SessionUser;
    } catch {
        return null;
    }
}

// Require authentication
export async function requireAuth(request: Request): Promise<SessionUser> {
    const user = await getUserFromSession(request);

    if (!user) {
        throw redirect("/login");
    }

    if (user.role === "admin") {
        const url = new URL(request.url);
        const rawModCompanyId = url.searchParams.get("modCompanyId");
        if (rawModCompanyId) {
            const parsedModCompanyId = Number.parseInt(rawModCompanyId, 10);
            if (Number.isFinite(parsedModCompanyId) && parsedModCompanyId > 0) {
                return {
                    ...user,
                    companyId: parsedModCompanyId,
                };
            }
        }
    }

    return user;
}

// Require specific role
export async function requireRole(
    request: Request,
    allowedRoles: UserRole[]
): Promise<SessionUser> {
    const user = await requireAuth(request);

    if (!allowedRoles.includes(user.role)) {
        throw redirect("/unauthorized");
    }

    return user;
}

export async function requireAdmin(request: Request): Promise<SessionUser> {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    return user;
}

// Login user
export async function login(
    db: D1Database,
    email: string,
    password: string,
    request: Request
): Promise<{ user: SessionUser; cookie: string } | { error: string }> {
    let user: LoginUser | undefined;
    try {
        // Use raw SQL query to keep field mapping explicit
        const rawUser = await db
            .prepare(`
                SELECT
                    id,
                    email,
                    role,
                    name,
                    surname,
                    phone,
                    whatsapp,
                    telegram,
                    passport_number,
                    passport_photos,
                    driver_license_photos,
                    password_hash,
                    avatar_url,
                    hotel_id,
                    room_number,
                    location_id,
                    district_id,
                    address,
                    is_first_login,
                    archived_at,
                    created_at,
                    updated_at
                FROM users
                WHERE email = ?
                LIMIT 1
            `)
            .bind(email)
            .first();
        
        if (rawUser) {
            user = {
                id: rawUser.id,
                email: rawUser.email,
                role: rawUser.role,
                name: rawUser.name,
                surname: rawUser.surname,
                phone: rawUser.phone,
                whatsapp: rawUser.whatsapp,
                telegram: rawUser.telegram,
                passportNumber: rawUser.passport_number,
                passportPhotos: rawUser.passport_photos,
                driverLicensePhotos: rawUser.driver_license_photos,
                passwordHash: rawUser.password_hash,
                avatarUrl: rawUser.avatar_url,
                hotelId: rawUser.hotel_id,
                roomNumber: rawUser.room_number,
                locationId: rawUser.location_id,
                districtId: rawUser.district_id,
                address: rawUser.address,
                isFirstLogin: rawUser.is_first_login,
                archivedAt: rawUser.archived_at,
                createdAt: rawUser.created_at,
                updatedAt: rawUser.updated_at,
            } as LoginUser;
        }
    } catch (e) {
        return { error: "Database connection error. Please try again." };
    }

    if (!user) {
        return { error: "Invalid email or password" };
    }

    // Check if user is archived
    if (user.archivedAt) {
        return { error: "Invalid email or password" };
    }

    // Verify password
    try {
        if (!user.passwordHash) {
            return { error: "Invalid email or password" };
        }

        const ok = await verifyPasswordHash(password, user.passwordHash);
        if (!ok) {
            return { error: "Invalid email or password" };
        }
    } catch {
        return { error: "Invalid email or password" };
    }

    // Get company ID if user is partner or manager
    let companyId: number | undefined;

    try {
        if (user.role === "partner") {
            // Get company owned by this partner
            const companyResult = await db
                .prepare("SELECT id, archived_at FROM companies WHERE owner_id = ? LIMIT 1")
                .bind(user.id)
                .first<{ id: number; archived_at: number | null }>();

            // Check if company is archived
            if (companyResult?.archived_at) {
                return { error: "Invalid email or password" };
            }

            companyId = companyResult?.id;
        } else if (user.role === "manager") {
            // Get company where this user is a manager
            const managerResult = await db
                .prepare(`
                    SELECT m.company_id, c.archived_at
                    FROM managers m
                    JOIN companies c ON c.id = m.company_id
                    WHERE m.user_id = ? AND m.is_active = 1
                    LIMIT 1
                `)
                .bind(user.id)
                .first<{ company_id: number; archived_at: number | null }>();

            // Check if company is archived
            if (managerResult?.archived_at) {
                return { error: "Invalid email or password" };
            }

            companyId = managerResult?.company_id;
        }
    } catch {
        return { error: "Invalid email or password" };
    }

    const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        name: user.name,
        surname: user.surname,
        avatarUrl: user.avatarUrl,
        companyId,
    };

    let cookie: string;
    try {
        cookie = await getSessionCookie().serialize(sessionUser, getSessionCookieSerializeOptions(request));
    } catch {
        return { error: "Login failed at: session cookie serialize" };
    }

    return { user: sessionUser, cookie };
}

// Logout user
export async function logout(request: Request): Promise<string> {
    return getSessionCookie().serialize(null, getSessionCookieClearOptions(request));
}

// Get company ID for current user (for multi-tenancy)
export function getCompanyId(user: SessionUser): number | null {
    if (user.role === "admin") {
        return null; // Admin can access all companies
    }
    return user.companyId || null;
}
