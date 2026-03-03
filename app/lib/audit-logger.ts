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
 * Get prepared statement for audit log
 */
export function getQuickAuditStmt(params: AuditLogParams): D1PreparedStatement {
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

    return db
        .prepare(
            `
            INSERT INTO audit_logs (
                user_id, role, company_id, entity_type, entity_id, action,
                before_state, after_state, ip_address, user_agent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
        )
        .bind(
            userId,
            role,
            companyId || null,
            entityType,
            entityId ? (typeof entityId === 'number' ? entityId : Number(entityId) || null) : null,
            action,
            beforeState ? JSON.stringify(beforeState) : null,
            afterState ? JSON.stringify(afterState) : null,
            ipAddress || null,
            userAgent || null,
            new Date().toISOString()
        );
}

/**
 * Quick audit logging function (immediate execution)
 */
export async function quickAudit(params: AuditLogParams): Promise<void> {
    try {
        await getQuickAuditStmt(params).run();
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
