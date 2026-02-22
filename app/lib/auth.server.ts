import { createCookie, redirect } from "react-router";
import { verifyPasswordHash } from "~/lib/password.server";

// Session cookie configuration
// Note: secure flag is handled dynamically in serialize/parse calls
export const sessionCookie = createCookie("session", {
    httpOnly: true,
    secure: false, // Handled dynamically based on request protocol
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
});

export type UserRole = "admin" | "partner" | "manager" | "user";

export interface SessionUser {
    id: string;
    email: string;
    role: UserRole;
    name: string | null;
    surname: string | null;
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
    citizenship: string | null;
    city: string | null;
    countryId: number | null;
    dateOfBirth: string | null;
    gender: string | null;
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
        const session = await sessionCookie.parse(cookieHeader);

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

// Login user
export async function login(
    db: D1Database,
    email: string,
    password: string,
    request: Request
): Promise<{ user: SessionUser; cookie: string } | { error: string }> {
    const isSecureRequest = request.url.startsWith("https://");

    let user: LoginUser | undefined;
    try {
        // Use raw SQL query to avoid drizzle mapping issues
        const rawUser = await db
            .prepare("SELECT * FROM users WHERE email = ? LIMIT 1")
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
                citizenship: rawUser.citizenship,
                city: rawUser.city,
                countryId: rawUser.country_id,
                dateOfBirth: rawUser.date_of_birth,
                gender: rawUser.gender,
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
        return { error: "User with this email does not exist" };
    }

    // Check if user is archived
    if (user.archivedAt) {
        return { error: "Account has been archived. Please contact support" };
    }

    // Verify password
    try {
        if (!user.passwordHash) {
            return { error: "Invalid password" };
        }

        const ok = await verifyPasswordHash(password, user.passwordHash);
        if (!ok) {
            return { error: "Invalid password" };
        }
    } catch {
        return { error: "Login failed at: password verification" };
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
                return { error: "Company has been archived. Please contact support" };
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
                return { error: "Company has been archived. Please contact support" };
            }

            companyId = managerResult?.company_id;
        }
    } catch {
        return { error: "Login failed at: company lookup" };
    }

    const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        name: user.name,
        surname: user.surname,
        companyId,
    };

    let cookie: string;
    try {
        cookie = await sessionCookie.serialize(sessionUser, {
            secure: isSecureRequest,
        });
    } catch {
        return { error: "Login failed at: session cookie serialize" };
    }

    return { user: sessionUser, cookie };
}

// Logout user
export async function logout(request: Request): Promise<string> {
    const isSecureRequest = request.url.startsWith("https://");
    return await sessionCookie.serialize(null, {
        maxAge: 0,
        secure: isSecureRequest,
    });
}

// Get company ID for current user (for multi-tenancy)
export function getCompanyId(user: SessionUser): number | null {
    if (user.role === "admin") {
        return null; // Admin can access all companies
    }
    return user.companyId || null;
}
