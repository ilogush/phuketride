import { addDays } from "date-fns";

export type UserNotificationWindows = {
    nowIso: string;
    threeDaysFromNowIso: string;
    sevenDaysAgoIso: string;
};

export type UserNotificationContractRow = {
    id: number;
    status: string;
    createdAt: string;
    endDate: string | null;
    carLicensePlate: string | null;
    brandName: string | null;
    modelName: string | null;
};

export function getUserNotificationWindows(now = new Date()): UserNotificationWindows {
    return {
        nowIso: now.toISOString(),
        threeDaysFromNowIso: addDays(now, 3).toISOString(),
        sevenDaysAgoIso: addDays(now, -7).toISOString(),
    };
}

export async function getUserNotificationsCount(db: D1Database, userId: string, windows: UserNotificationWindows) {
    const counts = await db
        .prepare(`
            SELECT
                SUM(CASE WHEN status = 'active' AND end_date >= ? AND end_date <= ? THEN 1 ELSE 0 END) AS upcomingCount,
                SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS recentCount
            FROM contracts
            WHERE client_id = ?
        `)
        .bind(windows.nowIso, windows.threeDaysFromNowIso, windows.sevenDaysAgoIso, userId)
        .first() as { upcomingCount?: number | string; recentCount?: number | string } | null;

    return Number(counts?.upcomingCount || 0) + Number(counts?.recentCount || 0);
}

export async function getUserNotificationContracts(
    db: D1Database,
    userId: string,
    windows: UserNotificationWindows,
    limit = 20
) {
    const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 20;
    const result = await db
        .prepare(`
            SELECT
                c.id,
                c.status,
                c.created_at AS createdAt,
                c.end_date AS endDate,
                cc.license_plate AS carLicensePlate,
                cb.name AS brandName,
                cm.name AS modelName
            FROM contracts c
            JOIN company_cars cc ON cc.id = c.company_car_id
            LEFT JOIN car_templates ct ON ct.id = cc.template_id
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            WHERE c.client_id = ?
              AND (
                (c.status = 'active' AND c.end_date >= ? AND c.end_date <= ?)
                OR c.created_at >= ?
              )
            ORDER BY c.created_at DESC
            LIMIT ?
        `)
        .bind(userId, windows.nowIso, windows.threeDaysFromNowIso, windows.sevenDaysAgoIso, normalizedLimit)
        .all() as { results?: UserNotificationContractRow[] };

    return result.results || [];
}
