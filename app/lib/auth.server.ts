import { createCookie, redirect } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { users } from "~/db/schema";

// Session cookie configuration
export const sessionCookie = createCookie("session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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

// Simple password verification (in production, use proper hashing like bcrypt)
function verifyPassword(password: string, storedPassword: string, email?: string): boolean {
    // Admin has special password
    if (email === "ilogush@icloud.com") {
        return password === "220232";
    }
    // For demo purposes, all other test users have password "password123"
    return password === "password123";
}

// Get user from session
export async function getUserFromSession(
    request: Request
): Promise<SessionUser | null> {
    const cookieHeader = request.headers.get("Cookie");
    const session = await sessionCookie.parse(cookieHeader);

    if (!session?.id) {
        return null;
    }

    return session as SessionUser;
}

// Require authentication
export async function requireAuth(request: Request): Promise<SessionUser> {
    const user = await getUserFromSession(request);

    if (!user) {
        throw redirect("/login");
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
    password: string
): Promise<{ user: SessionUser; cookie: string } | { error: string }> {
    const drizzleDb = drizzle(db);

    // Find user by email
    const [user] = await drizzleDb
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    if (!user) {
        return { error: "Invalid email or password" };
    }

    // Verify password (simplified for demo)
    if (!verifyPassword(password, "password123", email)) {
        return { error: "Invalid email or password" };
    }

    // Get company ID if user is partner or manager
    let companyId: number | undefined;

    if (user.role === "partner") {
        // Get company owned by this partner
        const companyResult = await db
            .prepare("SELECT id FROM companies WHERE owner_id = ? LIMIT 1")
            .bind(user.id)
            .first<{ id: number }>();
        companyId = companyResult?.id;
    } else if (user.role === "manager") {
        // Get company where this user is a manager
        const managerResult = await db
            .prepare("SELECT company_id FROM managers WHERE user_id = ? AND is_active = 1 LIMIT 1")
            .bind(user.id)
            .first<{ company_id: number }>();
        companyId = managerResult?.company_id;
    }

    const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        name: user.name,
        surname: user.surname,
        companyId,
    };

    const cookie = await sessionCookie.serialize(sessionUser);

    return { user: sessionUser, cookie };
}

// Logout user
export async function logout(request: Request): Promise<string> {
    return await sessionCookie.serialize(null, { maxAge: 0 });
}

// Get company ID for current user (for multi-tenancy)
export function getCompanyId(user: SessionUser): number | null {
    if (user.role === "admin") {
        return null; // Admin can access all companies
    }
    return user.companyId || null;
}
