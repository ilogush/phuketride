export type AuditAction = "create" | "update" | "delete" | "view" | "export" | "clear";
export type EntityType = "user" | "company" | "car" | "contract" | "payment" | "color" | "model" | "brand" | "district" | "hotel" | "season" | "duration" | "booking" | "car_template" | "calendar-event";

interface AuditLogParams {
    db: D1Database;
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
        await db
            .prepare(
                `
                INSERT INTO audit_logs (
                    user_id, role, company_id, entity_type, entity_id, action,
                    before_state, after_state, ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `
            )
            .bind(
                userId,
                role,
                companyId || null,
                entityType,
                entityId ? Number(entityId) : null,
                action,
                beforeState ? JSON.stringify(beforeState) : null,
                afterState ? JSON.stringify(afterState) : null,
                ipAddress || null,
                userAgent || null
            )
            .run();
    } catch {
        // Audit logging should never break the main flow.
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
