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
    options?: { limit?: number; offset?: number; companyId?: number | null }
) {
    const limit = options?.limit ?? QUERY_LIMITS.LARGE;
    const offset = options?.offset ?? 0;
    const companyId = options?.companyId ?? null;

    const whereClause = companyId !== null ? "WHERE a.company_id = ?" : "";
    const binding = companyId !== null ? [companyId] : [];

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
            ${whereClause}
            ORDER BY a.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
            `
        )
        .bind(...binding)
        .all<AuditLogRow>();

    return result.results ?? [];
}

export async function countAuditLogs(
    db: D1Database,
    companyId: number | null = null
) {
    const whereClause = companyId !== null ? "WHERE company_id = ?" : "";
    const binding = companyId !== null ? [companyId] : [];

    const result = await db
        .prepare(`SELECT count(*) AS count FROM audit_logs ${whereClause}`)
        .bind(...binding)
        .first<CountRow>();
    
    return toNumber(result?.count);
}

export async function clearAuditLogs(db: D1Database, companyId: number | null = null) {
    if (companyId !== null) {
        await db.prepare("DELETE FROM audit_logs WHERE company_id = ?").bind(companyId).run();
    } else {
        await db.prepare("DELETE FROM audit_logs").run();
    }
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
    params: { startMs: number; todayStartMs: number; companyId: number | null }
) {
    const { companyId } = params;
    
    // Base queries
    const contractsLast7DaysQuery = companyId !== null 
        ? "SELECT COUNT(*) FROM contracts c INNER JOIN company_cars cc ON cc.id = c.company_car_id WHERE c.created_at >= ? AND cc.company_id = ?"
        : "SELECT COUNT(*) FROM contracts WHERE created_at >= ?";
    
    const activeContractsQuery = companyId !== null
        ? "SELECT COUNT(*) FROM contracts c INNER JOIN company_cars cc ON cc.id = c.company_car_id WHERE c.status = 'active' AND cc.company_id = ?"
        : "SELECT COUNT(*) FROM contracts WHERE status = 'active'";
    
    const closedTodayQuery = companyId !== null
        ? "SELECT COUNT(*) FROM contracts c INNER JOIN company_cars cc ON cc.id = c.company_car_id WHERE c.status = 'closed' AND c.updated_at >= ? AND cc.company_id = ?"
        : "SELECT COUNT(*) FROM contracts WHERE status = 'closed' AND updated_at >= ?";
    
    const auditEntriesQuery = companyId !== null
        ? "SELECT COUNT(*) FROM audit_logs WHERE company_id = ?"
        : "SELECT COUNT(*) FROM audit_logs";
        
    // Global metrics (only for admin, or limited for partner)
    const locationsTrackedQuery = companyId !== null
        ? "SELECT COUNT(DISTINCT location_id) FROM companies WHERE id = ? AND location_id IS NOT NULL"
        : "SELECT COUNT(DISTINCT location_id) FROM companies WHERE location_id IS NOT NULL";
        
    const companiesTrackedQuery = companyId !== null
        ? "SELECT COUNT(*) FROM companies WHERE id = ?"
        : "SELECT COUNT(*) FROM companies";

    const result = await db
        .prepare(
            `
            SELECT
              (${contractsLast7DaysQuery}) AS contractsCreatedLast7Days,
              (${locationsTrackedQuery}) AS locationsTracked,
              (${companiesTrackedQuery}) AS companiesTracked,
              (${activeContractsQuery}) AS activeContracts,
              (${closedTodayQuery}) AS closedToday,
              (${auditEntriesQuery}) AS auditEntries
            `
        )
        .bind(
            ...(companyId !== null
                ? [
                    params.startMs, companyId, // contracts last 7 days
                    companyId,                // locations tracked
                    companyId,                // companies tracked
                    companyId,                // active contracts
                    params.todayStartMs, companyId, // closed today
                    companyId                 // audit entries
                ]
                : [params.startMs, params.todayStartMs])
        )
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
