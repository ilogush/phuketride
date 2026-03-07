import { QUERY_LIMITS } from "~/lib/query-limits";

type CountRow = { count: number | string | null };

export interface AuditLogRow {
    id: number;
    userId: string | null;
    role: string | null;
    companyId: number | null;
    entityType: string;
    entityId: number | null;
    action: string;
    beforeState: string | null;
    afterState: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string | number | Date | null;
    userName: string | null;
    userSurname: string | null;
}

export interface DashboardActivityPoint {
    date: string;
    count: number;
}

export interface DashboardLocationPoint {
    location: string | null;
    count: number;
}

export interface ContractStats {
    active: number;
    closed: number;
    closedToday: number;
}

export interface AnalyticsReportSummary {
    contractsCreatedLast7Days: number;
    locationsTracked: number;
    companiesTracked: number;
    activeContracts: number;
    closedToday: number;
    auditEntries: number;
}

function toNumber(value: number | string | null | undefined) {
    return Number(value ?? 0);
}

export async function listAuditLogs(
    db: D1Database,
    options?: { limit?: number; offset?: number }
) {
    const limit = options?.limit ?? QUERY_LIMITS.LARGE;
    const offset = options?.offset ?? 0;
    const result = await db
        .prepare(
            `
            SELECT
              a.id, a.user_id AS userId, a.role, a.company_id AS companyId,
              a.entity_type AS entityType, a.entity_id AS entityId, a.action,
              a.before_state AS beforeState, a.after_state AS afterState,
              a.ip_address AS ipAddress, a.user_agent AS userAgent,
              a.created_at AS createdAt,
              u.name AS userName, u.surname AS userSurname
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
            `
        )
        .all<AuditLogRow>();

    return result.results ?? [];
}

export async function clearAuditLogs(db: D1Database) {
    await db.prepare("DELETE FROM audit_logs").run();
}

export async function countContractsCreatedBetween(
    db: D1Database,
    params: { startMs: number; endMs: number; companyId: number | null }
) {
    if (params.companyId === null) {
        const result = await db
            .prepare("SELECT count(*) AS count FROM contracts WHERE created_at >= ? AND created_at < ?")
            .bind(params.startMs, params.endMs)
            .first<CountRow>();
        return toNumber(result?.count);
    }

    const result = await db
        .prepare(
            `
            SELECT count(*) AS count
            FROM contracts c
            INNER JOIN company_cars cc ON cc.id = c.company_car_id
            WHERE c.created_at >= ? AND c.created_at < ? AND cc.company_id = ?
            `
        )
        .bind(params.startMs, params.endMs, params.companyId)
        .first<CountRow>();

    return toNumber(result?.count);
}

export async function listCompaniesByLocation(
    db: D1Database,
    params: { companyId: number | null; limit?: number }
) {
    if (params.companyId === null) {
        const result = await db
            .prepare(
                `
                SELECT l.name AS location, COUNT(DISTINCT c.id) AS count
                FROM companies c
                LEFT JOIN locations l ON c.location_id = l.id
                GROUP BY l.name
                LIMIT ${params.limit ?? 5}
                `
            )
            .all<DashboardLocationPoint>();
        return result.results ?? [];
    }

    const result = await db
        .prepare(
            `
            SELECT l.name AS location, COUNT(DISTINCT c.id) AS count
            FROM companies c
            LEFT JOIN locations l ON c.location_id = l.id
            WHERE c.id = ?
            GROUP BY l.name
            LIMIT 1
            `
        )
        .bind(params.companyId)
        .all<DashboardLocationPoint>();

    return result.results ?? [];
}

export async function countContractsByStatus(
    db: D1Database,
    params: { status: "active" | "closed"; companyId: number | null; updatedSinceMs?: number }
) {
    const hasUpdatedSince = typeof params.updatedSinceMs === "number";

    if (params.companyId === null) {
        const result = await db
            .prepare(
                hasUpdatedSince
                    ? "SELECT count(*) AS count FROM contracts WHERE status = ? AND updated_at >= ?"
                    : "SELECT count(*) AS count FROM contracts WHERE status = ?"
            )
            .bind(...(hasUpdatedSince ? [params.status, params.updatedSinceMs] : [params.status]))
            .first<CountRow>();
        return toNumber(result?.count);
    }

    const result = await db
        .prepare(
            `
            SELECT count(*) AS count
            FROM contracts c
            INNER JOIN company_cars cc ON cc.id = c.company_car_id
            WHERE c.status = ?
              ${hasUpdatedSince ? "AND c.updated_at >= ?" : ""}
              AND cc.company_id = ?
            `
        )
        .bind(
            ...(hasUpdatedSince
                ? [params.status, params.updatedSinceMs, params.companyId]
                : [params.status, params.companyId])
        )
        .first<CountRow>();

    return toNumber(result?.count);
}

export async function getAnalyticsReportSummary(
    db: D1Database,
    params: { startMs: number; todayStartMs: number }
) {
    const result = await db
        .prepare(
            `
            SELECT
              (SELECT COUNT(*) FROM contracts WHERE created_at >= ?) AS contractsCreatedLast7Days,
              (SELECT COUNT(DISTINCT location_id) FROM companies WHERE location_id IS NOT NULL) AS locationsTracked,
              (SELECT COUNT(*) FROM companies) AS companiesTracked,
              (SELECT COUNT(*) FROM contracts WHERE status = 'active') AS activeContracts,
              (SELECT COUNT(*) FROM contracts WHERE status = 'closed' AND updated_at >= ?) AS closedToday,
              (SELECT COUNT(*) FROM audit_logs) AS auditEntries
            `
        )
        .bind(params.startMs, params.todayStartMs)
        .first<{
            contractsCreatedLast7Days: number | string | null;
            locationsTracked: number | string | null;
            companiesTracked: number | string | null;
            activeContracts: number | string | null;
            closedToday: number | string | null;
            auditEntries: number | string | null;
        }>();

    return {
        contractsCreatedLast7Days: toNumber(result?.contractsCreatedLast7Days),
        locationsTracked: toNumber(result?.locationsTracked),
        companiesTracked: toNumber(result?.companiesTracked),
        activeContracts: toNumber(result?.activeContracts),
        closedToday: toNumber(result?.closedToday),
        auditEntries: toNumber(result?.auditEntries),
    } satisfies AnalyticsReportSummary;
}

export async function getDashboardTaskById(
    db: D1Database,
    params: { taskId: number; companyId: number | null }
) {
    if (params.companyId === null) {
        return db
            .prepare("SELECT id FROM calendar_events WHERE id = ? LIMIT 1")
            .bind(params.taskId)
            .first<{ id: number }>();
    }

    return db
        .prepare("SELECT id FROM calendar_events WHERE id = ? AND company_id = ? LIMIT 1")
        .bind(params.taskId, params.companyId)
        .first<{ id: number }>();
}

export async function deleteDashboardTask(
    db: D1Database,
    params: { taskId: number; companyId: number | null }
) {
    if (params.companyId === null) {
        await db.prepare("DELETE FROM calendar_events WHERE id = ?").bind(params.taskId).run();
        return;
    }

    await db
        .prepare("DELETE FROM calendar_events WHERE id = ? AND company_id = ?")
        .bind(params.taskId, params.companyId)
        .run();
}
