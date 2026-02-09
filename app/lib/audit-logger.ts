import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";

export type AuditAction = "create" | "update" | "delete" | "view" | "export" | "clear";
export type EntityType = "user" | "company" | "car" | "contract" | "payment" | "color" | "model" | "brand" | "district" | "hotel" | "season" | "duration" | "booking" | "car_template";

interface AuditLogParams {
    db: ReturnType<typeof drizzle>;
    userId: string;
    role: string;
    companyId?: number | null;
    entityType: EntityType;
    entityId?: number | string;
    action: AuditAction;
    beforeState?: any;
    afterState?: any;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Quick audit logging function
 * Logs user actions to audit_logs table
 * Executes asynchronously without blocking the main flow
 */
export async function quickAudit(params: AuditLogParams): Promise<void> {
    const {
        db,
        userId,
        role,
        companyId,
        entityType,
        entityId,
        action,
        beforeState,
        afterState,
        ipAddress,
        userAgent,
    } = params;

    try {
        await db.insert(schema.auditLogs).values({
            userId,
            role,
            companyId: companyId || null,
            entityType,
            entityId: entityId ? Number(entityId) : null,
            action,
            beforeState: beforeState ? JSON.stringify(beforeState) : null,
            afterState: afterState ? JSON.stringify(afterState) : null,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
        });
    } catch (error) {
        // Log error but don't throw - audit logging should not break the main flow
        console.error("Audit logging failed:", error);
    }
}

/**
 * Helper to extract IP and User-Agent from request
 */
export function getRequestMetadata(request: Request): { ipAddress?: string; userAgent?: string } {
    return {
        ipAddress: request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || undefined,
        userAgent: request.headers.get("User-Agent") || undefined,
    };
}
