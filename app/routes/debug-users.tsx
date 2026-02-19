import { type LoaderFunctionArgs } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { verifyPasswordHash } from "~/lib/password.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const db = drizzle(context.cloudflare.env.DB, { schema });
    
    // Get all users
    const allUsers = await db.select().from(schema.users);
    
    // Test credentials
    const TEST_USERS = [
        { email: "admin@phuketride.com", password: "admin123" },
        { email: "test@phuketride.com", password: "password123" },
        { email: "user@test.com", password: "user123" },
    ];
    
    const results = [];
    
    for (const { email, password } of TEST_USERS) {
        const user = allUsers.find(u => u.email === email);
        
        if (!user) {
            results.push({ email, status: "NOT_FOUND" });
            continue;
        }

        if (!user.passwordHash) {
            results.push({ email, status: "NO_PASSWORD" });
            continue;
        }

        const isValid = await verifyPasswordHash(password, user.passwordHash);
        
        results.push({
            email,
            status: isValid ? "OK" : "INVALID",
            role: user.role,
            hashPreview: user.passwordHash.substring(0, 50) + "...",
        });
    }
    
    return Response.json({
        totalUsers: allUsers.length,
        users: allUsers.map(u => ({
            id: u.id,
            email: u.email,
            role: u.role,
            hasPassword: !!u.passwordHash,
        })),
        credentialTests: results,
    });
}
