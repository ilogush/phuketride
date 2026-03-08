import type { UserRole } from "~/lib/auth.server";

export type AuditAction =
    | "create"
    | "update"
    | "delete"
    | "view"
    | "export"
    | "clear"
    | "login"
    | "logout"
    | "login_failed"
    | "login_blocked"
    | "access_denied";

export type EntityType =
    | "user"
    | "company"
    | "car"
    | "contract"
    | "payment"
    | "booking"
    | "color"
    | "model"
    | "brand"
    | "district"
    | "location"
    | "hotel"
    | "season"
    | "duration"
    | "payment_status"
    | "car_template"
    | "calendar_event"
    | "task"
    | "id_document"
    | "system"
    | "analytics";

interface AuditLogParams {
    db: D1Database;
    userId?: string | null;
    role: UserRole | string;
    companyId?: number | null;
    entityType: EntityType;
    entityId?: number | string;
    action: AuditAction;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
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
            userId || null,
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
