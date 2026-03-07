import { QUERY_LIMITS } from "~/lib/query-limits";

export type CalendarEventRow = {
    id: number;
    title: string;
    startDate: string | number;
    color?: string | null;
    eventType?: string | null;
};

export type CalendarContractRow = {
    id: number;
    endDate: string | number;
};

export type CalendarBookingRow = {
    id: number;
    startDate: string | number;
};

export async function listCalendarMonthSnapshot(args: {
    db: D1Database;
    companyId: number;
    startIso: string;
    endIso: string;
}) {
    const [eventsResult, contractsResult, bookingsResult] = await Promise.all([
        args.db
            .prepare(`
                SELECT
                    id,
                    title,
                    start_date AS startDate,
                    color,
                    event_type AS eventType
                FROM calendar_events
                WHERE company_id = ? AND start_date >= ? AND start_date <= ?
                ORDER BY start_date ASC
                LIMIT ${QUERY_LIMITS.LARGE}
            `)
            .bind(args.companyId, args.startIso, args.endIso)
            .all(),
        args.db
            .prepare(`
                SELECT
                    c.id,
                    c.end_date AS endDate
                FROM contracts c
                JOIN company_cars cc ON cc.id = c.company_car_id
                WHERE cc.company_id = ? AND c.status = 'active' AND c.end_date >= ? AND c.end_date <= ?
                LIMIT ${QUERY_LIMITS.MEDIUM}
            `)
            .bind(args.companyId, args.startIso, args.endIso)
            .all(),
        args.db
            .prepare(`
                SELECT
                    b.id,
                    b.start_date AS startDate
                FROM bookings b
                JOIN company_cars cc ON cc.id = b.company_car_id
                WHERE cc.company_id = ? AND b.status IN ('pending', 'confirmed') AND b.start_date >= ? AND b.start_date <= ?
                LIMIT ${QUERY_LIMITS.MEDIUM}
            `)
            .bind(args.companyId, args.startIso, args.endIso)
            .all(),
    ]);

    return {
        events: (((eventsResult as unknown) as { results?: CalendarEventRow[] }).results ?? []) as CalendarEventRow[],
        contracts: (((contractsResult as unknown) as { results?: CalendarContractRow[] }).results ?? []) as CalendarContractRow[],
        bookings: (((bookingsResult as unknown) as { results?: CalendarBookingRow[] }).results ?? []) as CalendarBookingRow[],
    };
}

export async function listUpcomingCalendarContracts(args: {
    db: D1Database;
    companyId: number;
    startIso: string;
    endIso: string;
    limit: number;
}) {
    const result = await args.db
        .prepare(`
            SELECT c.id, c.end_date AS endDate
            FROM contracts c
            JOIN company_cars cc ON cc.id = c.company_car_id
            WHERE cc.company_id = ? AND c.end_date >= ? AND c.end_date <= ?
            ORDER BY c.end_date ASC
            LIMIT ?
        `)
        .bind(args.companyId, args.startIso, args.endIso, args.limit)
        .all();

    return ((((result as unknown) as { results?: CalendarContractRow[] }).results ?? []) as CalendarContractRow[]);
}

export async function listUpcomingCalendarEvents(args: {
    db: D1Database;
    companyId: number;
    startIso: string;
    endIso: string;
    limit: number;
}) {
    const result = await args.db
        .prepare(`
            SELECT id, title, start_date AS startDate, event_type AS eventType
            FROM calendar_events
            WHERE company_id = ? AND start_date >= ? AND start_date <= ?
            ORDER BY start_date ASC
            LIMIT ?
        `)
        .bind(args.companyId, args.startIso, args.endIso, args.limit)
        .all();

    return ((((result as unknown) as { results?: CalendarEventRow[] }).results ?? []) as CalendarEventRow[]);
}
